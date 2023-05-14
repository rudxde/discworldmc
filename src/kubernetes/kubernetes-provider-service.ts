import type { KubernetesDeployment } from '../domain/entities/kubernetes';
import { KubernetesProvider } from '../domain/outbound';
import { KubeConfig, AppsV1Api } from '@kubernetes/client-node';
import { KubernetesConfig } from './config';

export class KubernetesProviderService implements KubernetesProvider {

    private kubeApi: AppsV1Api;

    private constructor(
        private config: KubernetesConfig,
    ) {
        const kc = new KubeConfig();
        if (config.configPath) {
            kc.loadFromFile(config.configPath);
        } else {
            kc.loadFromDefault();
        }
        this.kubeApi = kc.makeApiClient(AppsV1Api);
    }

    static async init(config: KubernetesConfig): Promise<KubernetesProviderService> {
        return new KubernetesProviderService(config);
    }

    async getDeploymentsInNamespace(): Promise<KubernetesDeployment[]> {
        // V1DeploymentList
        const result = await this.kubeApi.listNamespacedDeployment(this.config.namespace);
        return result.body.items.map((item): KubernetesDeployment => ({
            name: item.metadata?.name ?? '',
            namespace: item.metadata?.namespace ?? '',
            specReplicas: item.spec?.replicas ?? 0,
            readyReplicas: item.status?.readyReplicas ?? 0,
        }));
    }

    async getDeployment(name: string): Promise<KubernetesDeployment | undefined> {
        const result = await this.kubeApi.readNamespacedDeploymentStatus(name, this.config.namespace);
        if (
            !result.body.metadata ||
            !result.body.metadata.name ||
            !result.body.metadata.namespace ||
            !result.body.spec ||
            !result.body.spec.replicas ||
            !result.body.status ||
            !result.body.status.readyReplicas
        ) {
            return undefined;
        }
        return {
            name: result.body.metadata?.name ?? '',
            namespace: result.body.metadata?.namespace ?? '',
            specReplicas: result.body.spec?.replicas ?? 0,
            readyReplicas: result.body.status?.readyReplicas ?? 0,
        };
    }

    async scaleDeployment(name: string, replicas: number): Promise<void> {
        await this.kubeApi.replaceNamespacedDeploymentScale(name, this.config.namespace, { spec: { replicas } });
    }

}
