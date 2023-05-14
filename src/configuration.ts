import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';

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
