import { BaseError } from './base-error';

export class InvalidCommand extends BaseError {
    readonly i18nEntry = 'invalidCommand';
    constructor(readonly commandName: string) {
        super(`Invalid slash command: '/${commandName}'`);
    }
}
