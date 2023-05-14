import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString, ValidateNested } from 'class-validator';
import { AuthRoleConfig } from './auth/config/config';

export class Configuration {
    @IsString()
    declare kubernetesConfigPath: string;

    @IsString()
    declare kubernetesNamespace: string;

    /**
     * A list of servers.
     *
     * @type {ServerConfiguration[]}
     * @memberof Configuration
     */
    @ValidateNested({ each: true })
    @Type(() => ServerConfiguration)
    declare servers: ServerConfiguration[];


    @ValidateNested()
    @Type(() => RedisConfig)
    declare redis: RedisConfig;

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

    @IsString()
    @IsIn(['de', 'en'])
    declare language: string;
    
    @ValidateNested({each: true})
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
}

export class RedisConfig {
    @IsString()
    declare host: string;
    @IsNumber()
    declare port: number;
}
