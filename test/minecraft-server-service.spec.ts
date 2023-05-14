import { Configuration } from '../src/configuration';
import { KubernetesProvider, MinecraftServerStatusPersistenceProvider, MinecraftServerStatusProvider } from '../src/domain/outbound';
import { MinecraftServerService } from '../src/domain/service/minecraft-server-service';
import { KubernetesDeployment } from '../src/domain/entities/kubernetes';
import { ServerStatus } from '../src/domain/entities/server';
interface TestThisContext {
    minecraftPlayerCountProvider: MinecraftServerStatusProvider;
    minecraftServerStatusPersistence: MinecraftServerStatusPersistenceProvider;
    kubernetesProvider: KubernetesProvider;
    configuration: Configuration;

    minecraftPlayerCountProviderGetPlayerCountSpy: jasmine.Spy;
    minecraftServerStatusPersistenceSetPlayersLastSeenSpy: jasmine.Spy;
    minecraftServerStatusPersistenceGetPlayersLastSeenSpy: jasmine.Spy;
    minecraftServerStatusPersistenceSetServerStatusSpy: jasmine.Spy;
    minecraftServerStatusPersistenceGetServerStatusSpy: jasmine.Spy;
    kubernetesProviderGetDeploymentsInNamespaceSpy: jasmine.Spy;
    kubernetesProviderGetDeploymentSpy: jasmine.Spy;
    kubernetesProviderScaleDeploymentSpy: jasmine.Spy;
}

describe('MinecraftServerService', () => {
    beforeEach(function (this: TestThisContext) {

        this.minecraftPlayerCountProviderGetPlayerCountSpy = jasmine.createSpy(`MinecraftServerStatusProvider#getPlayerCount`);
        this.minecraftServerStatusPersistenceSetPlayersLastSeenSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#setPlayersLastSeen`);
        this.minecraftServerStatusPersistenceGetPlayersLastSeenSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#getPlayersLastSeen`);
        this.minecraftServerStatusPersistenceSetServerStatusSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#setServerStatus`);
        this.minecraftServerStatusPersistenceGetServerStatusSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#getServerStatus`);
        this.kubernetesProviderGetDeploymentsInNamespaceSpy = jasmine.createSpy(`KubernetesProvider#getDeploymentsInNamespace`);
        this.kubernetesProviderGetDeploymentSpy = jasmine.createSpy(`KubernetesProvider#getDeployment`);
        this.kubernetesProviderScaleDeploymentSpy = jasmine.createSpy(`KubernetesProvider#scaleDeployment`);


        this.minecraftPlayerCountProvider = {
            getPlayerCount: this.minecraftPlayerCountProviderGetPlayerCountSpy,
        };

        this.minecraftServerStatusPersistence = {
            setPlayersLastSeen: this.minecraftServerStatusPersistenceSetPlayersLastSeenSpy,
            getPlayersLastSeen: this.minecraftServerStatusPersistenceGetPlayersLastSeenSpy,
            setServerStatus: this.minecraftServerStatusPersistenceSetServerStatusSpy,
            getServerStatus: this.minecraftServerStatusPersistenceGetServerStatusSpy,
        };

        this.kubernetesProvider = {
            getDeploymentsInNamespace: this.kubernetesProviderGetDeploymentsInNamespaceSpy,
            getDeployment: this.kubernetesProviderGetDeploymentSpy,
            scaleDeployment: this.kubernetesProviderScaleDeploymentSpy,
        };
        this.configuration = {
            kubernetes: {
                namespace: 'kubernetes-namespace',
            },
            language: 'en',
            maxRunningServers: 1,
            redis: {
                host: 'redis-host',
                port: 1234,
            },
            serverStopTimeoutMs: 1000,
            servers: [],
            roles: [],
        };
    });

    it('should create', function (this: TestThisContext) {
        new MinecraftServerService(
            this.minecraftPlayerCountProvider,
            this.minecraftServerStatusPersistence,
            this.kubernetesProvider,
            this.configuration,
        );
    });

    describe('getServerStatus', () => {
        beforeEach(function (this: TestThisContext) {
            this.configuration.servers.push({
                id: 'server-id',
                deploymentName: 'deployment-name',
                displayName: 'display-name',
                serviceName: 'service-name',
            });
        });
        it('should return the running server status from the deployment', async function (this: TestThisContext) {
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(<KubernetesDeployment>{
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 1,
                readyReplicas: 1,
                totalReplicas: 1,
            });
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const statusResult = await minecraftServerService.getServerStatus('server-id');
            expect(statusResult).toEqual({
                id: 'server-id',
                displayName: 'display-name',
                status: ServerStatus.RUNNING,
            });
        });
        it('should return the starting server status from the deployment', async function (this: TestThisContext) {
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(<KubernetesDeployment>{
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 1,
                readyReplicas: 0,
                totalReplicas: 1,
            });
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const statusResult = await minecraftServerService.getServerStatus('server-id');
            expect(statusResult).toEqual({
                id: 'server-id',
                displayName: 'display-name',
                status: ServerStatus.STARTING,
            });
        });
        it('should return the stopping server status from the deployment', async function (this: TestThisContext) {
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(<KubernetesDeployment>{
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 0,
                readyReplicas: 1,
                totalReplicas: 1,
            });
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const statusResult = await minecraftServerService.getServerStatus('server-id');
            expect(statusResult).toEqual({
                id: 'server-id',
                displayName: 'display-name',
                status: ServerStatus.STOPPING,
            });
        });
        it('should return the stopped server status from the deployment', async function (this: TestThisContext) {
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(<KubernetesDeployment>{
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 0,
                readyReplicas: 0,
                totalReplicas: 0,
            });
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const statusResult = await minecraftServerService.getServerStatus('server-id');
            expect(statusResult).toEqual({
                id: 'server-id',
                displayName: 'display-name',
                status: ServerStatus.STOPPED,
            });
        });
        it('should throw ServerNotFound error when no deployment was found', async function (this: TestThisContext) {
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(undefined);
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const result = minecraftServerService.getServerStatus('server-id');
            await expectAsync(result).toBeRejectedWithError(`Server not found: server-id`);
        });
    });
});
