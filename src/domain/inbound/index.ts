import { MinecraftServerStatus } from '../entities/server';

export enum ServerStopReason {
    SCHEDULED = 'scheduled',
    MANUAL = 'manual',
}

export interface MinecraftServerProvider {
    getServerStatus(serverId: string): Promise<MinecraftServerStatus>;
    startServer(serverId: string): Promise<void>;
    stopServer(serverId: string): Promise<void>;
    getServers(): Promise<MinecraftServerStatus[]>;
    onServerStop(listener: (serverId: string, reason: ServerStopReason) => void): void;
}
