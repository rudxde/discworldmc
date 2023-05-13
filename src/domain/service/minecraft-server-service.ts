import { Configuration } from '../../configuration';
import { ServerNotFound } from '../../error/server-not-found';
import { WrongState } from '../../error/wrong-state';
import { KubernetesDeployment } from '../entities/kubernetes';
import { MinecraftServerStatus } from '../entities/server';
import type { MinecraftServerProvider, ServerStopReason } from '../inbound';
import type { KubernetesProvider, MinecraftPlayerCountProvider, MinecraftServerStatusPersistenceProvider } from '../outbound';

export class MinecraftServerService implements MinecraftServerProvider {

    constructor(
        private minecraftPlayerCountProvider: MinecraftPlayerCountProvider,
        private minecraftServerStatusPersistence: MinecraftServerStatusPersistenceProvider,
        private kubernetesProvider: KubernetesProvider,
        private configuration: Configuration,
    ) { }

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
    }

    async stopServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        if (status.status !== 'running') {
            throw new WrongState(`Server ${serverId} is not int status running`);
        }
        this.kubernetesProvider.scaleDeployment(this.configuration.kubernetesNamespace, serverId, 0);
    }

    async getServers(): Promise<MinecraftServerStatus[]> {
        const deployments = await this.kubernetesProvider.getDeploymentsInNamespace(this.configuration.kubernetesNamespace);
        const status: MinecraftServerStatus[] = this.configuration.servers.map((server) => {
            const deployment = deployments.find((d) => d.name === server.deploymentName);
            if (!deployment) {
                return {
                    id: server.id,
                    displayName: server.displayName,
                    status: 'stopped',
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

    onServerStop(listener: (serverId: string, reason: ServerStopReason) => void): void {
        throw new Error('Method not implemented.');
    }

    private getStatusForDeployment(deployment: KubernetesDeployment) {
        return deployment.readyReplicas > deployment.specReplicas ? 'stopping'
            : deployment.readyReplicas < deployment.specReplicas ? 'starting'
                : deployment.readyReplicas > 0 ? 'running'
                    : 'stopped';
    }

}
