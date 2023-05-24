import { Configuration } from '../src/configuration';
import { KubernetesProvider, MinecraftServerStatusPersistenceProvider, MinecraftServerStatusProvider } from '../src/domain/outbound';
import { MinecraftServerService } from '../src/domain/service/minecraft-server-service';
import { KubernetesDeployment } from '../src/domain/entities/kubernetes';
import { ServerStatus } from '../src/domain/entities/server';
import { ServerAlreadyRunning } from '../src/error/server-already-running';
import { ServerStartLimitError } from '../src/error/server-start-limit';
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

        this.minecraftPlayerCountProviderGetPlayerCountSpy = jasmine.createSpy(`MinecraftServerStatusProvider#getPlayerCount`)
            .and.returnValue(Promise.resolve({ playerCount: 0, maxPlayers: 20 }));
        this.minecraftServerStatusPersistenceSetPlayersLastSeenSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#setPlayersLastSeen`);
        this.minecraftServerStatusPersistenceGetPlayersLastSeenSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#getPlayersLastSeen`);
        this.minecraftServerStatusPersistenceSetServerStatusSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#setServerStatus`);
        this.minecraftServerStatusPersistenceGetServerStatusSpy = jasmine.createSpy(`MinecraftServerStatusPersistenceProvider#getServerStatus`);
        this.kubernetesProviderGetDeploymentsInNamespaceSpy = jasmine.createSpy(`KubernetesProvider#getDeploymentsInNamespace`);
        this.kubernetesProviderGetDeploymentSpy = jasmine.createSpy(`KubernetesProvider#getDeployment`);
        this.kubernetesProviderScaleDeploymentSpy = jasmine.createSpy(`KubernetesProvider#scaleDeployment`);


        this.minecraftPlayerCountProvider = {
            getServerPing: this.minecraftPlayerCountProviderGetPlayerCountSpy,
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
            interface: 'cli',
            kubernetes: {
                namespace: 'kubernetes-namespace',
            },
            language: 'en',
            maxRunningServers: 1,
            discord: {
                appId: '',
                token: '',
                guildId: '',
            },
            redis: {
                host: 'redis-host',
                port: 1234,
            },
            serverStopTimeoutMs: 1000,
            serverPingIntervalMs: 1000,
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
                servicePort: 25565,
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
                maxPlayers: 20,
                playerCount: 0,
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
                maxPlayers: 0,
                playerCount: 0,
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
                maxPlayers: 0,
                playerCount: 0,
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
                maxPlayers: 0,
                playerCount: 0,
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
    
    describe('startServer', () => {
        beforeEach(function (this: TestThisContext) {
            this.configuration.servers.push({
                id: 'server-1',
                deploymentName: 'deployment-name',
                displayName: 'display-name',
                serviceName: 'service-name',
                servicePort: 25565,
            });
        });
        it('should start the server', async function (this: TestThisContext) {
            const kubernetesServerDeployment: KubernetesDeployment = {
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 0,
                readyReplicas: 0,
                totalReplicas: 0,
            };
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(<KubernetesDeployment>kubernetesServerDeployment);
            this.kubernetesProviderGetDeploymentsInNamespaceSpy.and.resolveTo(<KubernetesDeployment[]>[kubernetesServerDeployment]);
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            await minecraftServerService.startServer('server-1');
            expect(this.kubernetesProviderScaleDeploymentSpy).toHaveBeenCalledWith('deployment-name', 1);
        });
        it('should not start the server if already running', async function (this: TestThisContext) {
            const kubernetesServerDeployment: KubernetesDeployment = {
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 1,
                readyReplicas: 1,
                totalReplicas: 1,
            };
            this.kubernetesProviderGetDeploymentSpy.and.resolveTo(<KubernetesDeployment>kubernetesServerDeployment);
            this.kubernetesProviderGetDeploymentsInNamespaceSpy.and.resolveTo(<KubernetesDeployment[]>[kubernetesServerDeployment]);
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const result = minecraftServerService.startServer('server-1');
            await expectAsync(result).toBeRejectedWith(new ServerAlreadyRunning('server-1'));
        });
        it('should not start other server if one server if already running', async function (this: TestThisContext) {
            this.configuration.servers.push({
                id: 'server-2',
                deploymentName: 'deployment2-name',
                displayName: 'display-name-2',
                serviceName: 'service-name-2',
                servicePort: 25565,
            });
            const kubernetesServer1Deployment: KubernetesDeployment = {
                name: 'deployment-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 0,
                readyReplicas: 0,
                totalReplicas: 0,
            };
            const kubernetesServer2Deployment: KubernetesDeployment = {
                name: 'deployment2-name',
                namespace: 'kubernetes-namespace',
                specReplicas: 1,
                readyReplicas: 1,
                totalReplicas: 1,
            };
            this.kubernetesProviderGetDeploymentSpy.and.callFake((id) => [ kubernetesServer1Deployment,kubernetesServer2Deployment].find((d) => d.name === id));
            this.kubernetesProviderGetDeploymentsInNamespaceSpy.and.resolveTo(<KubernetesDeployment[]>[
                kubernetesServer1Deployment,
                kubernetesServer2Deployment,
            ]);
            const minecraftServerService = new MinecraftServerService(
                this.minecraftPlayerCountProvider,
                this.minecraftServerStatusPersistence,
                this.kubernetesProvider,
                this.configuration,
            );
            const result = minecraftServerService.startServer('server-1');
            await expectAsync(result).toBeRejectedWith(new ServerStartLimitError('server-1', 1));
        });
    });
});
