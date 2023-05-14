import { Configuration } from '../configuration';
import { MinecraftServerStatusProvider } from '../domain/outbound';
import { ping } from 'minecraft-protocol';

export class MinecraftServerStatusProviderService implements MinecraftServerStatusProvider {

    constructor(
        private config: Configuration,
    ) { }

    async getPlayerCount(serverId: string): Promise<number> {
        const serverHostname = this.config.servers.find((server) => server.id === serverId)?.serviceName;
        if (!serverHostname) {
            throw new Error(`Server ${serverId} not found`);
        }
        const result = await ping({ host: serverHostname, port: 25565 });
        const playerCount = 'playerCount' in result ? result.playerCount : result.players.online;
        return playerCount;
    }

}
