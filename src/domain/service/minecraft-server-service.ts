import { Configuration, ServerConfiguration } from '../../configuration';
import { ServerNotFound } from '../../error/server-not-found';
import { ServerStartLimitError } from '../../error/server-start-limit';
import { WrongState } from '../../error/wrong-state';
import { KubernetesDeployment } from '../entities/kubernetes';
import { MinecraftServerInfo, MinecraftServerStatus, ServerStatus } from '../entities/server';
import { MinecraftServerProvider, OnServerStopListener, ServerEvent } from '../inbound';
import type { KubernetesProvider, MinecraftServerStatusProvider, MinecraftServerStatusPersistenceProvider } from '../outbound';

export class MinecraftServerService implements MinecraftServerProvider {

    private onServerStopListeners: OnServerStopListener[] = [];
    private scheduledInterval: NodeJS.Timeout | undefined;

    constructor(
        private minecraftPlayerCountProvider: MinecraftServerStatusProvider,
        private minecraftServerStatusPersistence: MinecraftServerStatusPersistenceProvider,
        private kubernetesProvider: KubernetesProvider,
        private configuration: Configuration,
    ) { }

    start(): void {
        this.scheduledInterval = setInterval(
            () => this.scheduledCheckServerTasks().catch((error) => console.error(error)), 
            this.configuration.serverPingIntervalMs,
        );
    }

    stop(): void {
        if (this.scheduledInterval) {
            clearInterval(this.scheduledInterval);
        }
    }

    async getServerStatus(serverId: string): Promise<MinecraftServerStatus> {
        const serverConfigEntry = this.configuration.servers.find((server) => server.id === serverId);
        if (!serverConfigEntry) {
            console.log(`Server ${serverId} not found`);
            throw new ServerNotFound(serverId);
        }
        const deployment = await this.kubernetesProvider.getDeployment(serverConfigEntry.deploymentName);
        if (!deployment) {
            console.log(`Deployment ${serverConfigEntry.deploymentName} not found`);
            throw new ServerNotFound(serverId);
        }
        const status = this.getStatusForDeployment(deployment);
        return {
            id: serverId,
            displayName: serverConfigEntry.displayName,
            status,
        };
    }

    async startServer(serverId: string): Promise<void> {
        await this.ensureServerLimitNotReached();
        const status = await this.getServerStatus(serverId);
        if (status.status !== 'stopped') {
            throw new WrongState(`Server ${serverId} is not in status stopped`);
        }
        const serverConfigEntry = this.getServerConfig(serverId);
        await this.kubernetesProvider.scaleDeployment(serverConfigEntry.deploymentName, 1);
        await this.minecraftServerStatusPersistence.setPlayersLastSeen(serverId, new Date());
        await this.minecraftServerStatusPersistence.setServerStatus(serverId, ServerStatus.STARTING);
    }

    async stopServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        if (status.status !== 'running') {
            throw new WrongState(`Server ${serverId} is not in status running`);
        }
        const serverConfigEntry = this.getServerConfig(serverId);
        await this.kubernetesProvider.scaleDeployment(serverConfigEntry.deploymentName, 0);
        await this.minecraftServerStatusPersistence.setServerStatus(serverId, ServerStatus.STOPPING);
    }

    async getServers(): Promise<MinecraftServerStatus[]> {
        const deployments = await this.kubernetesProvider.getDeploymentsInNamespace();
        const status: MinecraftServerStatus[] = this.configuration.servers.map((server) => {
            const deployment = deployments.find((d) => d.name === server.deploymentName);
            if (!deployment) {
                return {
                    id: server.id,
                    displayName: server.displayName,
                    status: ServerStatus.STOPPED,
                };
            }
            return {
                id: server.id,
                displayName: server.displayName,
                status: this.getStatusForDeployment(deployment),
            };
        });
        return status;
    }

    getServerInfos(): MinecraftServerInfo[] {
        return this.configuration.servers.map(server => ({
            id: server.id,
            displayName: server.displayName,
        }));
    }

    onServerEvent(listener: (serverId: string, reason: ServerEvent) => void): void {
        this.onServerStopListeners.push(listener);
    }

    private async ensureServerLimitNotReached(): Promise<void> {
        const servers = await this.getServers();
        const runningServers = servers.filter(
            (server) =>
                server.status === ServerStatus.RUNNING
                || server.status === ServerStatus.STARTING
                || server.status === ServerStatus.STOPPING,
        );
        if (runningServers.length >= this.configuration.maxRunningServers) {
            throw new ServerStartLimitError();
        }
    }


    private getStatusForDeployment(deployment: KubernetesDeployment): ServerStatus {
        if (deployment.specReplicas === 0) {
            return deployment.totalReplicas === 0 ? ServerStatus.STOPPED : ServerStatus.STOPPING;
        } else {
            return deployment.readyReplicas === deployment.specReplicas ? ServerStatus.RUNNING : ServerStatus.STARTING;
        }
    }

    private async scheduledCheckServerTasks(): Promise<void> {
        const serverstatus = await this.getServers();

        for (const server of serverstatus) {
            const lastServerStatus = await this.minecraftServerStatusPersistence.getServerStatus(server.id);
            await this.minecraftServerStatusPersistence.setServerStatus(server.id, server.status);
            if (!lastServerStatus) {
                continue;
            }
            if (lastServerStatus === server.status) {
                continue;
            }
            if (lastServerStatus === ServerStatus.STOPPING && server.status === ServerStatus.STOPPED) {
                this.broadcastMessage(server.id, ServerEvent.STOPPED);
            }
            if (lastServerStatus === ServerStatus.STARTING && server.status === ServerStatus.RUNNING) {
                this.broadcastMessage(server.id, ServerEvent.STARTED);
            }
        }


        const runningServers = serverstatus.filter((server) => server.status === ServerStatus.RUNNING);
        const now = new Date();
        for (const server of runningServers) {
            try {
                const playerCount = await this.minecraftPlayerCountProvider.getPlayerCount(server.id);
                if (playerCount !== 0) {
                    await this.minecraftServerStatusPersistence.setPlayersLastSeen(server.id, now);
                }
                const lastSeen = await this.minecraftServerStatusPersistence.getPlayersLastSeen(server.id) ?? now;
                const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
                if (timeSinceLastSeen > this.configuration.serverStopTimeoutMs) {
                    await this.stopServer(server.id);
                }
            } catch (error) {
                // prevent shutdown of unreachable servers
                await this.minecraftServerStatusPersistence.setPlayersLastSeen(server.id, now);
                continue;
            }
        }
    }

    private broadcastMessage(serverId: string, event: ServerEvent): void {
        for (const listener of this.onServerStopListeners) {
            listener(serverId, event);
        }
    }

    private getServerConfig(serverId: string): ServerConfiguration {
        const serverConfigEntry = this.configuration.servers.find((server) => server.id === serverId);
        if (!serverConfigEntry) {
            throw new ServerNotFound(serverId);
        }
        return serverConfigEntry;
    }

}
