import { MinecraftServerInfo, MinecraftServerStatus } from '../../domain/entities/server';
import { OnServerStopListener } from '../../domain/inbound';
import { PossibleActions } from '../../domain/entities/possible-action';

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
    getServerInfos(possibleAction?: PossibleActions): Promise<MinecraftServerInfo[]>;
    getAllowedServerInfosForPermissions(roles: string[], possibleAction: PossibleActions): Promise<MinecraftServerInfo[]>;
    onServerEvent(listener: OnServerStopListener): void;
}
