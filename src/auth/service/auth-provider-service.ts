import { AuthRoleConfig } from '../config/config';
import { AuthProvider } from '../inbound';

export class AuthProviderService implements AuthProvider {
    constructor(
        private config: AuthRoleConfig[],
    ) { }

    checkForPermission(
        requiredPermission: string,
        roleIds: string[],
    ): boolean {
        const permissions = this.getPermissions(roleIds);
        return this.hasPermission(requiredPermission, permissions);
    }

    private getPermissions(roleIds: string[]): string[] {
        const permissions: string[] = [];
        for (const roleId of roleIds) {
            const roleConfig = this.config.find((config) => config.roleId === roleId);
            if (!roleConfig) {
                continue;
            }
            permissions.push(...roleConfig.permissions);
        }
        return permissions;
    }

    private hasPermission(
        requiredPermission: string,
        permissions: string[],
    ): boolean {
        if (!requiredPermission) {
            throw new Error('hasPermission failed; requiredPermission is Empty!');
        }
        if (!permissions) {
            // undefined or empty string are no permissions
            return false;
        }
        for (const permission of permissions) {
            if (!permission) {
                // undefined or empty string are no permissions
                continue;
            }
            if (
                permission.startsWith(requiredPermission + '.') ||
                requiredPermission === permission
            ) {
                return true;
            }
            if (permission.endsWith('.*')) {
                const wildcardPermissionRoot = permission.substring(
                    0,
                    permission.length - 2,
                );
                if (
                    requiredPermission.startsWith(wildcardPermissionRoot + '.') ||
                    requiredPermission === wildcardPermissionRoot
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
