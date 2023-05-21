# Discworldmc

Discworldmc is a Discord bot that provides various commands to manage and monitor Minecraft servers. It allows users to start, stop, and check the status of servers directly from Discord.

## Discord commands

The following commands are available for interacting with the bot on Discord:

- `/dw server list` -> returns a list of all servers and if they are currently running
- `/dw server start <server>` -> starts a server
- `/dw server stop <server>` -> stops a server
- `/dw server status <server>` -> returns a detailed status of a server


## Installation

### Adding the bot to a server

To add the bot to your Discord server, click on the following link:

```
https://discord.com/oauth2/authorize?client_id=<app_id>&scope=bot%20applications.commands&permissions=274877908992
```

Make sure to replace <app_id> with the actual application ID of the bot. The bot requires the following permissions:

- send messages
- send messages in threads


The permissions number to be granted is 274877908992.


### Kubernetes Setup

Discworldmc is designed to work specifically with Kubernetes for managing Minecraft servers. Follow the steps below to set up Discworldmc within your Kubernetes environment:



1. Ensure that you have a Kubernetes cluster set up and running.
2. Deploy your Minecraft servers as Kubernetes deployments within a specific namespace.
3. Create a role within the namespace to grant Discworldmc the necessary permissions. Use the following YAML configuration as an example:
<details>
  <summary>Example manifest file</summary>

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: minecraft
  name: discworldmc-role
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments/scale"]
  verbs: ["update"]
```
</details>
4. Create a service account and bind the role to it within the namespace.
<details>
  <summary>Example manifest file</summary>

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: discworldmc-service-account
  namespace: minecraft
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: discworldmc-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: discworldmc-role
subjects:
- kind: ServiceAccount
  name: discworldmc-service-account
  namespace: minecraft
```
</details>
5. Generate the configuration file for Discworldmc, following the provided [config-example.json5](config-example.json5) template file.
6. Create a Kubernetes secret to store the generated configuration file. Ensure that the secret is accessible within the same namespace as the Minecraft deployments.
7. Deploy Discworldmc using the Kubernetes manifest file, and make sure to mount the secret containing the configuration file. Set the `CONFIG_FILE_PATH` environment variable to specify the path to the config file within the container.
<details>
  <summary>Example manifest file</summary>

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discworldmc
  namespace: minecraft
  labels:
    app: discworldmc
spec:
  replicas: 1
  selector:
    matchLabels:
      app: discworldmc
  template:
    metadata:
      labels:
        app: discworldmc
    spec:
      containers:
      - name: discworldmc
        image: rudxde/discworldmc:build.45
        env:
          - name: CONFIG_FILE_PATH
            value: /path/to/config-file.json5
        volumeMounts:
          - name: config-volume
            mountPath: /path/to/config-file.json5
            subPath: config-file.json5
      volumes:
        - name: config-volume
          secret:
            secretName: discworldmc-config-secret
```
</details>

<br>
By following these steps, you can successfully integrate Discworldmc with your Kubernetes environment, allowing you to manage your Minecraft servers using Discord commands.

## Contributing

We welcome contributions to Discworldmc. If you encounter any issues or have ideas for improvements, please open an issue or submit a pull request on the [GitHub repository](https://github.com/rudxde/discworldmc).

