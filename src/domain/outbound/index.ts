import type { KubernetesDeployment } from '../entities/kubernetes';
import type { ServerStatus } from '../entities/server';

export interface MinecraftPlayerCountProvider {
    getPlayerCount(serverId: string): Promise<number>;
}

export interface MinecraftServerStatusPersistenceProvider {
    setPlayersLastSeen(serverId: string, lastSeen: Date): Promise<void>;
    getPlayersLastSeen(serverId: string): Promise<Date | undefined>;
    setServerStatus(serverId: string, status: ServerStatus): Promise<void>;
    getServerStatus(serverId: string): Promise<ServerStatus | undefined>;
}

export interface KubernetesProvider {
    getDeploymentsInNamespace(namespace: string): Promise<KubernetesDeployment[]>;
    getDeployment(namespace: string, name: string): Promise<KubernetesDeployment | undefined>;
    scaleDeployment(namespace: string, name: string, replicas: number): Promise<void>;
}
