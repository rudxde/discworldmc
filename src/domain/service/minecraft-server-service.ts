import { Configuration, ServerConfiguration } from '../../configuration';
import { ServerAlreadyRunning } from '../../error/server-already-running';
import { ServerAlreadyStopped } from '../../error/server-already-stopped';
import { ServerIsStarting } from '../../error/server-is-starting';
import { ServerIsStopping } from '../../error/server-is-stopping';
import { ServerNotFound } from '../../error/server-not-found';
import { ServerStartLimitError } from '../../error/server-start-limit';
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
        let playerCount = 0;
        let maxPlayers = 0;
        if (status === ServerStatus.RUNNING) {
            const pingResult = await this.minecraftPlayerCountProvider.getServerPing(serverConfigEntry.id);
            playerCount = pingResult.playerCount;
            maxPlayers = pingResult.maxPlayers;
        }
        return {
            id: serverId,
            displayName: serverConfigEntry.displayName,
            status,
            playerCount,
            maxPlayers,
        };
    }

    async startServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        if (status.status === ServerStatus.RUNNING) {
            throw new ServerAlreadyRunning(serverId);
        }
        if (status.status === ServerStatus.STARTING) {
            throw new ServerIsStarting(serverId);
        }
        if (status.status === ServerStatus.STOPPING) {
            throw new ServerIsStopping(serverId);
        }
        await this.ensureServerLimitNotReached(serverId);
        const serverConfigEntry = this.getServerConfig(serverId);
        await this.kubernetesProvider.scaleDeployment(serverConfigEntry.deploymentName, 1);
        await this.minecraftServerStatusPersistence.setPlayersLastSeen(serverId, new Date());
        await this.minecraftServerStatusPersistence.setServerStatus(serverId, ServerStatus.STARTING);
    }

    async stopServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        if (status.status === ServerStatus.STOPPED) {
            throw new ServerAlreadyStopped(serverId);
        }
        if (status.status === ServerStatus.STARTING) {
            throw new ServerIsStarting(serverId);
        }
        if (status.status === ServerStatus.STOPPING) {
            throw new ServerIsStopping(serverId);
        }
        const serverConfigEntry = this.getServerConfig(serverId);
        await this.kubernetesProvider.scaleDeployment(serverConfigEntry.deploymentName, 0);
        await this.minecraftServerStatusPersistence.setServerStatus(serverId, ServerStatus.STOPPING);
    }

    async getServers(): Promise<MinecraftServerStatus[]> {
        const deployments = await this.kubernetesProvider.getDeploymentsInNamespace();
        const status: MinecraftServerStatus[] = await Promise.all(this.configuration.servers.map(async (server) => {
            const deployment = deployments.find((d) => d.name === server.deploymentName);
            if (!deployment) {
                return <MinecraftServerStatus>{
                    id: server.id,
                    displayName: server.displayName,
                    status: ServerStatus.STOPPED,
                    maxPlayers: 0,
                    playerCount: 0,
                };
            }
            const status = this.getStatusForDeployment(deployment);
            let playerCount = 0;
            let maxPlayers = 0;
            if (status === ServerStatus.RUNNING) {
                const pingResult = await this.minecraftPlayerCountProvider.getServerPing(server.id)
                    .catch((error) => {
                        console.error(error);
                        return { playerCount: 0, maxPlayers: 0 };
                    });
                playerCount = pingResult.playerCount;
                maxPlayers = pingResult.maxPlayers;
            }
            return <MinecraftServerStatus>{
                id: server.id,
                displayName: server.displayName,
                status: status,
                playerCount,
                maxPlayers,
            };
        }));
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

    private async ensureServerLimitNotReached(startingServerId: string): Promise<void> {
        const servers = await this.getServers();
        const runningServers = servers.filter(
            (server) =>
                server.status === ServerStatus.RUNNING
                || server.status === ServerStatus.STARTING
                || server.status === ServerStatus.STOPPING,
        );
        if (runningServers.length >= this.configuration.maxRunningServers) {
            throw new ServerStartLimitError(startingServerId, this.configuration.maxRunningServers);
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
            if (server.status === ServerStatus.STOPPED) {
                await this.broadcastMessage(server.id, ServerEvent.STOPPED);
            }
            if (server.status === ServerStatus.RUNNING) {
                await this.broadcastMessage(server.id, ServerEvent.STARTED);
            }
        }


        const runningServers = serverstatus.filter((server) => server.status === ServerStatus.RUNNING);
        const now = new Date();
        for (const server of runningServers) {
            try {
                const pingResult = await this.minecraftPlayerCountProvider.getServerPing(server.id);
                if (pingResult.playerCount !== 0) {
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

    private async broadcastMessage(serverId: string, event: ServerEvent): Promise<void> {
        await Promise.all(this.onServerStopListeners.map(
            async (listener) => {
                try {
                    await listener(serverId, event);
                } catch (err) {
                    console.error(err);
                }
            },
        ));
    }

    private getServerConfig(serverId: string): ServerConfiguration {
        const serverConfigEntry = this.configuration.servers.find((server) => server.id === serverId);
        if (!serverConfigEntry) {
            throw new ServerNotFound(serverId);
        }
        return serverConfigEntry;
    }

}
