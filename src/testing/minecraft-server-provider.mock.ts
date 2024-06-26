import { MinecraftServerProvider, OnServerStopListener } from '../domain/inbound';
import { MinecraftServerInfo, MinecraftServerStatus, ServerStatus } from '../domain/entities/server';
import { ServerNotFound } from '../error/server-not-found';

export class MinecraftServerProviderMock implements MinecraftServerProvider {
    private readonly servers: MinecraftServerStatus[] = [
        { id: 'lobby', displayName: 'Lobby', status: ServerStatus.RUNNING, maxPlayers: 0, playerCount: 20 },
        { id: 'pvp', displayName: 'PvP Arena', status: ServerStatus.STOPPED, maxPlayers: 0, playerCount: 0 },
        { id: 's1', displayName: 'Survival World 1', status: ServerStatus.STOPPED, maxPlayers: 0, playerCount: 0 },
        { id: 's2', displayName: 'Survival World 2', status: ServerStatus.RUNNING, maxPlayers: 0, playerCount: 20 },
        { id: 'creative', displayName: 'Creative World', status: ServerStatus.STOPPED, maxPlayers: 0, playerCount: 0 },
    ];

    async getServerStatus(serverId: string): Promise<MinecraftServerStatus> {
        const status = this.servers.find(server => server.id === serverId);
        if (!status) {
            throw new ServerNotFound(serverId);
        }
        return status;
    }

    async startServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        status.status = ServerStatus.STARTING;
        setTimeout(() => {
            status.status = ServerStatus.RUNNING;
        }, 10000);
    }

    async stopServer(serverId: string): Promise<void> {
        const status = await this.getServerStatus(serverId);
        status.status = ServerStatus.STOPPING;
        setTimeout(() => {
            status.status = ServerStatus.STOPPED;
        }, 10000);
    }

    async getServers(): Promise<MinecraftServerStatus[]> {
        return this.servers;
    }

    async getServerInfos(): Promise<MinecraftServerInfo[]> {
        return this.servers.map(server => ({
            id: server.id,
            displayName: server.displayName,
        }));
    }

    onServerEvent(listener: OnServerStopListener): void { }
}
