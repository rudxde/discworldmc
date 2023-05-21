import { BaseError } from './base-error';

export class ServerAlreadyStopped extends BaseError {
    readonly i18nEntry = 'serverAlreadyStopped';
    constructor(
        public serverId: string,
    ) {
        super(`Server ${serverId} is already stopped!`);
    }
}
