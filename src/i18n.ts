import { IsString } from 'class-validator';

export class I18n {
    @IsString()
    declare serverShutdown: string;
}
