import type { KubernetesDeployment } from '../entities/kubernetes';

export interface MinecraftPlayerCountProvider {
    getPlayerCount(serverId: string): Promise<number>;
}

export interface MinecraftServerStatusPersistenceProvider {
    setPlayersLastSeen(serverId: string, lastSeen: Date): Promise<void>;
    getPlayersLastSeen(serverId: string): Promise<Date>;
}

export interface KubernetesProvider {
    getDeploymentsInNamespace(namespace: string): Promise<KubernetesDeployment[]>;
    getDeployment(namespace: string, name: string): Promise<KubernetesDeployment | undefined>;
    scaleDeployment(namespace: string, name: string, replicas: number): Promise<void>;
}
