import { MinecraftServerProvider } from '../domain/inbound';

export class CliInterface {

    constructor(
        private minecraftServerService: MinecraftServerProvider,
    ) { }

    start(): void {
        const readline = require('readline');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });

        this.minecraftServerService.onServerEvent((serverId, reason) => {
            console.log({ serverId, reason });
        });

        rl.on('line', (line: string) => {
            switch (line.split(' ')[0]) {
                case 'start':
                    this.minecraftServerService.startServer(line.split(' ')[1]).catch((err) => console.error(err));
                    break;
                case 'stop':
                    this.minecraftServerService.stopServer(line.split(' ')[1]).catch((err) => console.error(err));
                    break;
                case 'list':
                    this.minecraftServerService.getServers().then((servers) => console.log(servers)).catch((err) => console.error(err));
                    break;
                case 'status':
                    this.minecraftServerService.getServerStatus(line.split(' ')[1]).then((status) => console.log(status)).catch((err) => console.error(err));
                    break;
                case 'exit':
                    rl.close();
                default:
                    console.log('Unknown command');
            }
        });

        rl.once('close', () => {
            // end of input
            process.exit(0);
        });
    }
}
