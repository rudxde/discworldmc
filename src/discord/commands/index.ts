import {
    ChatInputCommandInteraction, RESTPostAPIApplicationCommandsJSONBody,
    SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { MinecraftServerProvider } from '../../domain/inbound';
import { InvalidCommand } from '../../error/invalid-command';
import { MinecraftServerInfo } from '../../domain/entities/server';
import { ServerNotFound } from '../../error/server-not-found';


export class DiscordCommandsManager {
    private readonly commandData: SlashCommandSubcommandsOnlyBuilder;
    private readonly serverInfos: MinecraftServerInfo[];

    constructor(private readonly minecraftServerProvider: MinecraftServerProvider) {
        this.serverInfos = this.minecraftServerProvider.getServerInfos();
        const serverChoices = this.serverInfos.map(server => ({
            name: server.id,
            value: `#${server.id}`,
        }));
        this.commandData = new SlashCommandBuilder()
            .setName('dw')
            .setDescription('Manage minecraft worlds')
            .setDefaultMemberPermissions('0')
            .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
                .setName('server')
                .setDescription('Commands regarding minecraft servers')
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('list')
                    .setDescription('List available servers and if they are currently running'),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('start')
                    .setDescription('Start a specific server')
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription('Id of the server to start')
                        .setRequired(true)
                        .setChoices(...serverChoices),
                    ),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('stop')
                    .setDescription('Stop a specific server')
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription('Id of the server to stop')
                        .setRequired(true)
                        .setChoices(...serverChoices),
                    ),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('status')
                    .setDescription('Displays the status of a specific server')
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription('Id of the server in question')
                        .setRequired(true)
                        .setChoices(...serverChoices),
                    ),
                ),
            );
    }

    getCommandJSON(): RESTPostAPIApplicationCommandsJSONBody {
        return this.commandData.toJSON();
    }

    async handleChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.commandName !== this.commandData.name) {
            throw new InvalidCommand(interaction.commandName);
        }
        const subcommandGroup = interaction.options.getSubcommandGroup(true);
        if (subcommandGroup === 'server') {
            const subcommand = interaction.options.getSubcommand(true);
            if (subcommand === 'list') {
                await this.listServers(interaction);
                return;
            }
            if (subcommand === 'start') {
                await this.startServer(interaction);
                return;
            }
            if (subcommand === 'stop') {
                await this.stopServer(interaction);
                return;
            }
            if (subcommand === 'status') {
                await this.getServerStatus(interaction);
                return;
            }
            throw new InvalidCommand(`${interaction.commandName} ${subcommandGroup} ${subcommand}`);
        }
        throw new InvalidCommand(`${interaction.commandName} ${subcommandGroup}`);
    }

    private async listServers(interaction: ChatInputCommandInteraction): Promise<void> {
        const servers = await this.minecraftServerProvider.getServers();
        let message = 'The following servers are available:\n';
        for (const server of servers) {
            message += `- **${server.displayName}**: id = '${server.id}', status = ${server.status}\n`;
        }
        await interaction.reply(message);
    }

    private async startServer(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverInfo = this.getServerInfo(interaction);
        await interaction.reply(
            `Starting server: **${serverInfo.displayName}** #${serverInfo.id}`,
        );
        await this.minecraftServerProvider.startServer(serverInfo.id);
    }

    private async stopServer(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverInfo = this.getServerInfo(interaction);
        await interaction.reply(
            `Stopping server: **${serverInfo.displayName}** #${serverInfo.id}`,
        );
        await this.minecraftServerProvider.stopServer(serverInfo.id);
    }

    private async getServerStatus(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverInfo = this.getServerInfo(interaction);
        const status = await this.minecraftServerProvider.getServerStatus(serverInfo.id);
        await interaction.reply(`**${status.displayName}** #${status.id}: ${status.status}`);
    }

    private getServerInfo(interaction: ChatInputCommandInteraction): MinecraftServerInfo {
        const id = stripIdHashtag(interaction.options.getString('server-id', true));
        const serverInfo = this.serverInfos.find(server => server.id === id);
        if (!serverInfo) {
            throw new ServerNotFound(id);
        }
        return serverInfo;
    }
}

function stripIdHashtag(idArg: string): string {
    if (!idArg.startsWith('#')) {
        throw new Error(`Invalid server id: ${idArg}`);
    }
    return idArg.substring(1);
}
