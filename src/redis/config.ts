import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RedisConfig {
    @IsString()
    declare host: string;
    @IsNumber()
    @IsOptional()
    declare port?: number;
}
