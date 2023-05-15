import { IsString } from 'class-validator';


export class DiscordConfiguration {
    @IsString()
    declare appId: string;

    @IsString()
    declare token: string;

    @IsString()
    declare guildId: string;
}
