import { IsNumber, IsString } from 'class-validator';

export class RedisConfig {
    @IsString()
    declare host: string;
    @IsNumber()
    declare port: number;
}
