export interface MinecraftServerStatus {
    serverId: string;
    status: 'running' | 'stopped';
}

export interface MinecraftServerEntry {
    id: string;
    displayName: string;
}
