export class ServerNotFound extends Error {

    serverId: string;

    constructor(serverId: string) {
        super(`Server not found: ${serverId}`);
        this.serverId = serverId;
    }
}
