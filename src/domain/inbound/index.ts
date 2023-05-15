import { MinecraftServerInfo, MinecraftServerStatus } from '../entities/server';

export enum ServerEvent {
    STOPPED = 'stopped',
    STARTED = 'started',
}

export type OnServerStopListener = (serverId: string, reason: ServerEvent) => void;

export interface MinecraftServerProvider {
    getServerStatus(serverId: string): Promise<MinecraftServerStatus>;
    startServer(serverId: string): Promise<void>;
    stopServer(serverId: string): Promise<void>;
    getServers(): Promise<MinecraftServerStatus[]>;
    getServerInfos(): MinecraftServerInfo[];
    onServerEvent(listener: OnServerStopListener): void;
}
