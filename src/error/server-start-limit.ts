import { BaseError } from './base-error';

export class ServerStartLimitError extends BaseError {
    readonly i18nEntry = 'serverLimitReached';
    constructor(
        public serverId: string,
        public limit: number,
    ) {
        super('Server start limit is reached');
    }
}
