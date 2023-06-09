import { MinecraftServerInfo, MinecraftServerStatus } from '../../domain/entities/server';
import { OnServerStopListener } from '../../domain/inbound';

export interface AuthProvider {
    checkForPermission(
        requiredPermission: string,
        roleIds: string[],
    ): boolean;
}

export interface AuthorizedMinecraftServerProvider {
    getServerStatus(serverId: string, roles: string[]): Promise<MinecraftServerStatus>;
    startServer(serverId: string, roles: string[]): Promise<void>;
    stopServer(serverId: string, roles: string[]): Promise<void>;
    getServers(roles: string[]): Promise<MinecraftServerStatus[]>;
    getServerInfos(): MinecraftServerInfo[];
    onServerEvent(listener: OnServerStopListener): void;
}
