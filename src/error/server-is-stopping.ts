import { BaseError } from './base-error';

export class ServerIsStopping extends BaseError {
    readonly i18nEntry = 'serverAlreadyRunning';
    constructor(
        public serverId: string,
    ) {
        super(`Server ${serverId} is stopping!`);
    }
}
