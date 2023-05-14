import type { KubernetesDeployment } from '../domain/entities/kubernetes';
import { KubernetesProvider } from '../domain/outbound';
import { KubeConfig, AppsV1Api } from '@kubernetes/client-node';

export class Kubernetes implements KubernetesProvider {

    private kubeApi: AppsV1Api;

    private constructor() {
        const kc = new KubeConfig();
        kc.loadFromDefault();
        this.kubeApi = kc.makeApiClient(AppsV1Api);
    }

    static async init(): Promise<Kubernetes> {
        return new Kubernetes();
    }

    async getDeploymentsInNamespace(namespace: string): Promise<KubernetesDeployment[]> {
        // V1DeploymentList
        const result = await this.kubeApi.listNamespacedDeployment(namespace)
        return result.body.items.map((item): KubernetesDeployment => ({
            name: item.metadata?.name ?? '',
            namespace: item.metadata?.namespace ?? '',
            specReplicas: item.spec?.replicas ?? 0,
            readyReplicas: item.status?.readyReplicas ?? 0
        }));
    }

    async getDeployment(namespace: string, name: string): Promise<KubernetesDeployment | undefined> {
        const result = await this.kubeApi.readNamespacedDeploymentStatus(name, namespace);
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
            readyReplicas: result.body.status?.readyReplicas ?? 0
        };
    }

    async scaleDeployment(namespace: string, name: string, replicas: number): Promise<void> {
        await this.kubeApi.replaceNamespacedDeploymentScale(name, namespace, { spec: { replicas } })
    }

}
