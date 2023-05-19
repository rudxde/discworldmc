import type { KubernetesDeployment } from '../entities/kubernetes';
import { MinecraftServerPing } from '../entities/minecraft-server-ping';
import type { ServerStatus } from '../entities/server';

export interface MinecraftServerStatusProvider {
    getServerPing(serverId: string): Promise<MinecraftServerPing>;
}

export interface MinecraftServerStatusPersistenceProvider {
    setPlayersLastSeen(serverId: string, lastSeen: Date): Promise<void>;
    getPlayersLastSeen(serverId: string): Promise<Date | undefined>;
    setServerStatus(serverId: string, status: ServerStatus): Promise<void>;
    getServerStatus(serverId: string): Promise<ServerStatus | undefined>;
}

export interface KubernetesProvider {
    getDeploymentsInNamespace(): Promise<KubernetesDeployment[]>;
    getDeployment(name: string): Promise<KubernetesDeployment | undefined>;
    scaleDeployment(name: string, replicas: number): Promise<void>;
}
