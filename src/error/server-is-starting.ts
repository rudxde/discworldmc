import { BaseError } from './base-error';

export class ServerIsStarting extends BaseError {
    readonly  = true;
    readonly i18nEntry = 'serverIsStarting';
    constructor(
        public serverId: string,
    ) {
        super(`Server ${serverId} is starting!`);
    }
}
