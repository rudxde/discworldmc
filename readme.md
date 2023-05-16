# Discworldmc


### Discord commands

- `/dw server list` -> returns a list of all servers and if they are currently running
- `/dw server start <server>` -> starts a server
- `/dw server stop <server>` -> stops a server
- `/dw server status <server>` -> returns a detailed status of a server


## Installation

### Adding the bot to a server

```
https://discord.com/oauth2/authorize?client_id=<app_id>&scope=bot%20applications.commands&permissions=274877908992
```

Discord bot permissions:
- send messages
- send messages in threads

--> Permissions number: 274877908992


### Kubernetes Setup

- have servers running as deployments in a kubernetes namespace
- create a role with the following permissions for the namespace:


```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments/scale"]
```

- create a service account and add a role binding for the namespace.

- create the config for the bot as a kubernetes secret, using the [config-example.json5](config-example.json5) file.

- deploy discworldmc with the config mounted and provide the path to the configfile in the `CONFIG_FILE_PATH` variable.