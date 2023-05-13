export interface MinecraftServerStatus {
    id: string;
    displayName: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping';
}
