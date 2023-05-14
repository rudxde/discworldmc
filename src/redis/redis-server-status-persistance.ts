import { ServerStatus } from '../domain/entities/server';
import { MinecraftServerStatusPersistenceProvider } from '../domain/outbound';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

export class RedisServerStatusPersistance implements MinecraftServerStatusPersistenceProvider {

    private constructor(
        public redisClient: RedisClientType<any, any>,
    ) { }

    static async init(redisHost: string, redisPort?: number): Promise<RedisServerStatusPersistance> {
        const redisClient: RedisClientType<any, any> = createClient({
            socket: {
                host: redisHost,
                ...(redisPort ? { port: redisPort } : {}),
            },
        });
        await redisClient.connect();
        return new RedisServerStatusPersistance(redisClient);
    }

    async setPlayersLastSeen(serverId: string, lastSeen: Date): Promise<void> {
        await this.redisClient.set(`server:${serverId}:lastSeen`, lastSeen.getTime());
    }

    async getPlayersLastSeen(serverId: string): Promise<Date | undefined> {
        const lastSeen = await this.redisClient.get(`server:${serverId}:lastSeen`);
        if (!lastSeen) {
            return undefined;
        }
        return new Date(parseInt(lastSeen, 10));
    }

    async setServerStatus(serverId: string, status: ServerStatus): Promise<void> {
        await this.redisClient.set(`server:${serverId}:status`, status);
    }

    async getServerStatus(serverId: string): Promise<ServerStatus | undefined> {
        const status = await this.redisClient.get(`server:${serverId}:status`);
        if (!status) {
            return undefined;
        }
        return status as ServerStatus;
    }

}
