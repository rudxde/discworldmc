export enum ServerStatus {
    RUNNING = 'running',
    STOPPED = 'stopped',
    STARTING = 'starting',
    STOPPING = 'stopping',
}

export interface MinecraftServerStatus {
    id: string;
    displayName: string;
    status: ServerStatus;
}
