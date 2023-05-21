import { BaseError } from './base-error';

export class UnauthorizedError extends BaseError {
    readonly i18nEntry = 'unauthorized';
    constructor(readonly request: string) {
        super(`Unauthorized request: '${request}'`);
    }
}
