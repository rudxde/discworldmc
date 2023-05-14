export interface KubernetesDeployment {
    name: string;
    namespace: string;
    specReplicas: number;
    readyReplicas: number;
    totalReplicas: number;
}
