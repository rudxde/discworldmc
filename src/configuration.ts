import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AuthRoleConfig } from './auth/config/config';
import { KubernetesConfig } from './kubernetes/config';
import { RedisConfig } from './redis/config';
import { DiscordConfiguration } from './discord/config';
import { Languages } from './i18n';

export class Configuration {
    /**
      * Use another interface than than discord for testing purposes.
      *
      * @type {string}
      * @memberof Configuration
      */
    @IsString()
    @IsIn(['discord', 'cli', 'http'])
    public interface: string = 'discord';

    /**
     * The limit of servers that can be running at the same time.
     */
    @IsNumber()
    declare maxRunningServers: number;

    /**
     * The timeout since the last player was detected until a server is stopped.
     *
     * @type {number}
     * @memberof Configuration
     */
    @IsNumber()
    declare serverStopTimeoutMs: number;
    
    /**
     * The interval in which each running server is checked.
     *
     * @type {number}
     * @memberof Configuration
     */
    @IsNumber()
    public serverPingIntervalMs: number = 10000;

    @IsString()
    @IsIn(Languages)
    declare language: string;

    @IsDefined()
    @ValidateNested()
    @Type(() => KubernetesConfig)
    public declare kubernetes: KubernetesConfig;

    @ValidateNested()
    @Type(() => DiscordConfiguration)
    declare discord?: DiscordConfiguration;
    /**
    * A list of servers.
    *
    * @type {ServerConfiguration[]}
    * @memberof Configuration
    */
    @IsDefined()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ServerConfiguration)
    declare servers: ServerConfiguration[];

    @IsDefined()
    @ValidateNested()
    @Type(() => RedisConfig)
    declare redis: RedisConfig;

    @ValidateNested({ each: true })
    @IsDefined()
    @Type(() => AuthRoleConfig)
    declare roles: AuthRoleConfig[];
}

export class ServerConfiguration {
    @IsString()
    declare deploymentName: string;
    @IsString()
    declare serviceName: string;
    @IsString()
    declare id: string;
    @IsString()
    declare displayName: string;
    @IsNumber()
    public servicePort: number = 25565;
}
