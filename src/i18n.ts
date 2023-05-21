import { Type } from 'class-transformer';
import { IsDefined, IsString, ValidateNested } from 'class-validator';

export class I18n {
    @IsString()
    declare serverShutdown: string;
    @IsString()
    declare serverList: string;
    @IsString()
    declare serverStatus: string;
    @IsString()
    declare startCommandFeedback: string;
    @IsString()
    declare stopCommandFeedback: string;
    @IsString()
    declare pendingAnswer: string;

    @IsDefined()
    @ValidateNested()
    @Type(() => ServerStatusText)
    declare statusEmoji: ServerStatusText;
    @IsDefined()
    @ValidateNested()
    @Type(() => ServerStatusText)
    declare statusSuffix: ServerStatusText;
    @IsDefined()
    @ValidateNested()
    @Type(() => CommandDescriptions)
    declare commandDescriptions: CommandDescriptions;
    @IsDefined()
    @ValidateNested()
    @Type(() => Errors)
    declare errors: Errors;
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

class CommandDescriptions {
    @IsString()
    declare rootCommand: string;
    @IsString()
    declare serverCommand: string;
    @IsString()
    declare listCommand: string;
    @IsString()
    declare startCommand: string;
    @IsString()
    declare stopCommand: string;
    @IsString()
    declare statusCommand: string;
    @IsString()
    declare startCommandServerId: string;
    @IsString()
    declare stopCommandServerId: string;
    @IsString()
    declare statusCommandServerId: string;
}

class Errors {
    @IsString()
    declare unknown: string;
    @IsString()
    declare unauthorized: string;
    @IsString()
    declare invalidCommand: string;
    @IsString()
    declare serverNotFound: string;
    @IsString()
    declare serverAlreadyRunning: string;
    @IsString()
    declare serverAlreadyStopped: string;
    @IsString()
    declare serverIsStopping: string;
    @IsString()
    declare serverIsStarting: string;
    @IsString()
    declare serverLimitReached: string;
}
