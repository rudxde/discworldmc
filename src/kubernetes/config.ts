import { IsOptional, IsString } from 'class-validator';

export class KubernetesConfig {
    @IsString()
    @IsOptional()
    declare configPath: string;

    @IsString()
    declare namespace: string;
}
