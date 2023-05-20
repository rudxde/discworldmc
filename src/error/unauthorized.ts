export class UnauthorizedError extends Error {
    constructor(readonly request: string) {
        super(`Unauthorized request: '${request}'`);
    }
}
