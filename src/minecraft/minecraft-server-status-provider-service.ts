import { Configuration } from '../configuration';
import { MinecraftServerStatusProvider } from '../domain/outbound';
import { ping } from 'minecraft-protocol';

export class MinecraftServerStatusProviderService implements MinecraftServerStatusProvider {

    constructor(
        private config: Configuration,
    ) { }

    async getPlayerCount(serverId: string): Promise<number> {
        const serverConfiguration = this.config.servers.find((server) => server.id === serverId);
        if (!serverConfiguration) {
            throw new Error(`Server ${serverId} not found`);
        }
        const result = await ping({ host: serverConfiguration.serviceName, port: serverConfiguration.servicePort });
        const playerCount = 'playerCount' in result ? result.playerCount : result.players.online;
        return playerCount;
    }

}
