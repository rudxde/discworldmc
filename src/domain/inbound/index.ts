import { MinecraftServerEntry, MinecraftServerStatus } from '../entities/server';

export interface MinecraftServerProvider {
    getServerStatus(serverId: string): Promise<MinecraftServerStatus>;
    startServer(serverId: string): Promise<void>;
    stopServer(serverId: string): Promise<void>;
    getServers(): Promise<MinecraftServerEntry[]>;
}
