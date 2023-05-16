import { Type } from 'class-transformer';
import { IsDefined, IsString, ValidateNested } from 'class-validator';

export class I18n {
    @IsString()
    declare serverShutdown: string;
    @IsString()
    declare serverList: string;
    @IsDefined()
    @ValidateNested()
    @Type(() => ServerStatusText)
    declare statusEmoji: ServerStatusText;
    @IsDefined()
    @ValidateNested()
    @Type(() => ServerStatusText)
    declare statusSuffix: ServerStatusText;
}

class ServerStatusText {
    @IsString()
    declare running: string;
    @IsString()
    declare stopped: string;
    @IsString()
    declare starting: string;
    @IsString()
    declare stopping: string;
}
