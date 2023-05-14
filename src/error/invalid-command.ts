export class InvalidCommand extends Error {
    constructor(readonly commandName: string) {
        super(`Invalid slash command: '/${commandName}'`);
    }
}
