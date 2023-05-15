export enum ServerStatus {
    RUNNING = 'running',
    STOPPED = 'stopped',
    STARTING = 'starting',
    STOPPING = 'stopping',
}

export interface MinecraftServerInfo {
    id: string;
    displayName: string;
}

export interface MinecraftServerStatus extends MinecraftServerInfo {
    status: ServerStatus;
}
