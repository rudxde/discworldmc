export interface AuthProvider {
    checkForPermission(
        requiredPermission: string,
        roleIds: string[],
    ): boolean;
}
