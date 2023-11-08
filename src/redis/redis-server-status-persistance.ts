import { ServerStatus } from '../domain/entities/server';
import { MinecraftServerStatusPersistenceProvider } from '../domain/outbound';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { RedisConfig } from './config';

export class RedisServerStatusPersistance implements MinecraftServerStatusPersistenceProvider {

    private constructor(
        public redisClient: RedisClientType<any, any>,
    ) { }

    static async init(config: RedisConfig): Promise<RedisServerStatusPersistance> {
        const redisClient: RedisClientType<any, any> = createClient({
            socket: {
                host: config.host,
                ...(config.port ? { port: config.port } : {}),
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

    async setServerStatus(serverId: string, newStatus: ServerStatus): Promise<ServerStatus | undefined> {
        const oldStatus = await this.redisClient.getSet(`server:${serverId}:status`, newStatus);
        if (!oldStatus) {
            return undefined;
        }
        return oldStatus as ServerStatus;
    }

    async getServerStatus(serverId: string): Promise<ServerStatus | undefined> {
        const status = await this.redisClient.get(`server:${serverId}:status`);
        if (!status) {
            return undefined;
        }
        return status as ServerStatus;
    }

}
