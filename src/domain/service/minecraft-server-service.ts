import { Configuration } from '../../configuration';
import { ServerNotFound } from '../../error/server-not-found';
import { WrongState } from '../../error/wrong-state';
import { KubernetesDeployment } from '../entities/kubernetes';
import { MinecraftServerStatus, ServerStatus } from '../entities/server';
import { MinecraftServerProvider, OnServerStopListener, ServerEvent } from '../inbound';
import type { KubernetesProvider, MinecraftPlayerCountProvider, MinecraftServerStatusPersistenceProvider } from '../outbound';

export class MinecraftServerService implements MinecraftServerProvider {

    private onServerStopListeners: OnServerStopListener[] = [];

    constructor(
        private minecraftPlayerCountProvider: MinecraftPlayerCountProvider,
        private minecraftServerStatusPersistence: MinecraftServerStatusPersistenceProvider,
        private kubernetesProvider: KubernetesProvider,
        private configuration: Configuration,
    ) { }

    start(): void {
        setInterval(() => this.scheduledCheckServerTasks().catch((error) => console.error(error)), 1000);
    }

    async getServerStatus(serverId: string): Promise<MinecraftServerStatus> {
        const serverConfigEntry = this.configuration.servers.find((server) => server.id === serverId);
        if (!serverConfigEntry) {
            throw new ServerNotFound(serverId);
        }
        const deployment = await this.kubernetesProvider.getDeployment(this.configuration.kubernetesNamespace, serverConfigEntry.deploymentName);
        if (!deployment) {
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
        const status = await this.getServerStatus(serverId);
        if (status.status !== 'stopped') {
            throw new WrongState(`Server ${serverId} is not int status stopped`);
        }
        this.kubernetesProvider.scaleDeployment(this.configuration.kubernetesNamespace, serverId, 1);
        await this.minecraftServerStatusPersistence.setPlayersLastSeen(serverId, new Date());
        await this.minecraftServerStatusPersistence.setServerStatus(serverId, ServerStatus.STARTING);
    }

    async stopServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        if (status.status !== 'running') {
            throw new WrongState(`Server ${serverId} is not int status running`);
        }
        this.kubernetesProvider.scaleDeployment(this.configuration.kubernetesNamespace, serverId, 0);
        await this.minecraftServerStatusPersistence.setServerStatus(serverId, ServerStatus.STOPPING);
    }

    async getServers(): Promise<MinecraftServerStatus[]> {
        const deployments = await this.kubernetesProvider.getDeploymentsInNamespace(this.configuration.kubernetesNamespace);
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

    onServerEvent(listener: (serverId: string, reason: ServerEvent) => void): void {
        this.onServerStopListeners.push(listener);
    }

    private getStatusForDeployment(deployment: KubernetesDeployment): ServerStatus {
        return deployment.readyReplicas > deployment.specReplicas ? ServerStatus.STOPPING
            : deployment.readyReplicas < deployment.specReplicas ? ServerStatus.STARTING
                : deployment.readyReplicas > 0 ? ServerStatus.RUNNING
                    : ServerStatus.STOPPED;
    }

    private async scheduledCheckServerTasks() {
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
            const playerCount = await this.minecraftPlayerCountProvider.getPlayerCount(server.id);
            if (playerCount !== 0) {
                await this.minecraftServerStatusPersistence.setPlayersLastSeen(server.id, now);
            }
            const lastSeen = await this.minecraftServerStatusPersistence.getPlayersLastSeen(server.id) ?? now;
            const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
            if (timeSinceLastSeen > this.configuration.serverStopTimeoutMs) {
                await this.stopServer(server.id);
            }
        }
    }

    private broadcastMessage(serverId: string, event: ServerEvent): void {
        for (const listener of this.onServerStopListeners) {
            listener(serverId, event);
        }
    }

}
