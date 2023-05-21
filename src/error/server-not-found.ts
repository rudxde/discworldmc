import { BaseError } from './base-error';

export class ServerNotFound extends BaseError {
    readonly i18nEntry = 'serverNotFound';

    constructor(
        public serverId: string,
    ) {
        super(`Server not found: ${serverId}`);
    }
}
