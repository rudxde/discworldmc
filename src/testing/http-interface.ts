import { MinecraftServerProvider } from '../domain/inbound';
import express from 'express';

export class HttpInterface {

    constructor(
        private minecraftServerService: MinecraftServerProvider,
    ) { }

    start(): void {

        this.minecraftServerService.onServerEvent((serverId, reason) => {
            console.log({ serverId, reason });
        });

        const app = express();
        app.use(express.json({ limit: '100mb' }));
        app.post('/start/:id', (req, res) => {
            const id = req.params['id'];
            if (!id) {
                res.status(400).send('Missing id');
                return;
            }
            this.minecraftServerService.startServer(id)
                .then(() => res.status(200).send('OK'))
                .catch((err) => res.status(500).send(err));
        });
        app.post('/stop/:id', (req, res) => {
            const id = req.params['id'];
            if (!id) {
                res.status(400).send('Missing id');
                return;
            }
            this.minecraftServerService.stopServer(id)
                .then(() => res.status(200).send('OK'))
                .catch((err) => res.status(500).send(err));
        });
        app.get('/list', (req, res) => {
            this.minecraftServerService.getServers()
                .then((result) => res.status(200).send(result))
                .catch((err) => res.status(500).send(err));
        });
        app.get('/status/:id', (req, res) => {
            const id = req.params['id'];
            if (!id) {
                res.status(400).send('Missing id');
                return;
            }
            this.minecraftServerService.getServerStatus(id)
                .then((result) => res.status(200).send(result))
                .catch((err) => res.status(500).send(err));
        });
        app.listen(80, () =>
            console.info(
                `Server listening on port 80!`,
            ),
        );
    }
}
