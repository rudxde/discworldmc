import { AuthProviderService } from '../src/auth/service/auth-provider-service';
import { AuthRoleConfig } from '../src/auth/config/config';
interface ThisContext {
    authProviderService: AuthProviderService;
    config: AuthRoleConfig[];
}

const ROLE_ID_1 = '74726394478478375322';
const ROLE_ID_2 = '58893672879463539433';
const ROLE_ID_3 = '33768246348489846923';

describe('Auth Provider Service', () => {
    beforeEach(function (this: ThisContext) {
        this.config = [];
        this.authProviderService = new AuthProviderService(this.config);
    });

    describe('checkForPermission', () => {
        it('should return false if no roles are given', function (this: ThisContext) {
            const result = this.authProviderService.checkForPermission('test', []);
            expect(result).toBe(false);
        });


        it('should return true if requiredPermission is given and correct role is given', function (this: ThisContext) {
            this.config.push({
                roleId: ROLE_ID_1,
                permissions: ['test.test'],
            });
            const result = this.authProviderService.checkForPermission('test.test', [ROLE_ID_1]);
            expect(result).toBe(true);
        });

        it('should return true if requiredPermission is given and multiple roles are given', function (this: ThisContext) {

            this.config.push({
                roleId: ROLE_ID_1,
                permissions: ['test.test1'],
            });
            this.config.push({
                roleId: ROLE_ID_2,
                permissions: ['test.test2'],
            });
            this.config.push({
                roleId: ROLE_ID_3,
                permissions: ['test.test3'],
            });
            const result = this.authProviderService.checkForPermission('test.test1', [ROLE_ID_1, ROLE_ID_3]);
            expect(result).toBe(true);
        });
    });
});
