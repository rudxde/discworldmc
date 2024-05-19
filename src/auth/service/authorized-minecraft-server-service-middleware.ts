import { PossibleActions } from '../../domain/entities/possible-action';
import { MinecraftServerStatus, MinecraftServerInfo } from '../../domain/entities/server';
import { MinecraftServerProvider, OnServerStopListener } from '../../domain/inbound';
import { UnauthorizedError } from '../../error/unauthorized';
import { AuthProvider, AuthorizedMinecraftServerProvider } from '../inbound';

export class AuthorizedMinecraftServerServiceMiddleware implements AuthorizedMinecraftServerProvider {

    constructor(
        private minecraftServerProvider: MinecraftServerProvider,
        private authProvider: AuthProvider,
    ) { }

    getServerStatus(serverId: string, roles: string[]): Promise<MinecraftServerStatus> {
        if (!this.authProvider.checkForPermission(`dw.server.status.${serverId}`, roles)) {
            throw new UnauthorizedError(`Unauthorized request: 'dw.server.status.${serverId}'`);
        }
        return this.minecraftServerProvider.getServerStatus(serverId);
    }

    startServer(serverId: string, roles: string[]): Promise<void> {
        if (!this.authProvider.checkForPermission(`dw.server.start.${serverId}`, roles)) {
            throw new UnauthorizedError(`Unauthorized request: 'dw.server.start.${serverId}', with roles: "${roles.join(', ')}"`);
        }
        return this.minecraftServerProvider.startServer(serverId);
    }

    stopServer(serverId: string, roles: string[]): Promise<void> {
        if (!this.authProvider.checkForPermission(`dw.server.stop.${serverId}`, roles)) {
            throw new UnauthorizedError(`Unauthorized request: 'dw.server.stop.${serverId}'`);
        }
        return this.minecraftServerProvider.stopServer(serverId);
    }

    getServers(roles: string[]): Promise<MinecraftServerStatus[]> {
        if (!this.authProvider.checkForPermission(`dw.server.list`, roles)) {
            throw new UnauthorizedError(`Unauthorized request: 'dw.server.list'`);
        }
        return this.minecraftServerProvider.getServers();
    }

    getServerInfos(): MinecraftServerInfo[] {
        return this.minecraftServerProvider.getServerInfos();
    }
    
    getAllowedServerInfosForPermissions(roles: string[], possibleAction: PossibleActions): MinecraftServerInfo[] {
        return this.minecraftServerProvider.getServerInfos().filter(serverInfo => {
            return this.authProvider.checkForPermission(`dw.server.${possibleAction}.${serverInfo.id}`, roles);
        });
    }

    onServerEvent(listener: OnServerStopListener): void {
        return this.minecraftServerProvider.onServerEvent(listener);
    }

}
