import {
    ChatInputCommandInteraction, RESTPostAPIApplicationCommandsJSONBody,
    SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { MinecraftServerProvider } from '../../domain/inbound';
import { InvalidCommand } from '../../error/invalid-command';
import { MinecraftServerInfo, ServerStatus } from '../../domain/entities/server';
import { ServerNotFound } from '../../error/server-not-found';
import { I18n } from '../../i18n';
import { AuthProvider } from '../../auth/inbound';
import { render as renderTemplate } from 'mustache';


export class DiscordCommandsManager {
    private readonly commandData: SlashCommandSubcommandsOnlyBuilder;
    private readonly serverInfos: MinecraftServerInfo[];

    constructor(
        private readonly minecraftServerProvider: MinecraftServerProvider,
        private readonly i18n: I18n,
        private readonly authProvider: AuthProvider,
    ) {
        this.serverInfos = this.minecraftServerProvider.getServerInfos();
        const serverChoices = this.serverInfos.map(server => ({
            name: server.id,
            value: `#${server.id}`,
        }));
        this.commandData = new SlashCommandBuilder()
            .setName('dw')
            .setDescription(this.i18n.commandDescriptions.rootCommand)
            .setDefaultMemberPermissions('0')
            .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
                .setName('server')
                .setDescription(this.i18n.commandDescriptions.serverCommand)
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('list')
                    .setDescription(this.i18n.commandDescriptions.listCommand),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('start')
                    .setDescription(this.i18n.commandDescriptions.startCommand)
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription(this.i18n.commandDescriptions.startCommandServerId)
                        .setRequired(true)
                        .setChoices(...serverChoices),
                    ),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('stop')
                    .setDescription(this.i18n.commandDescriptions.stopCommand)
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription(this.i18n.commandDescriptions.stopCommandServerId)
                        .setRequired(true)
                        .setChoices(...serverChoices),
                    ),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('status')
                    .setDescription(this.i18n.commandDescriptions.statusCommand)
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription(this.i18n.commandDescriptions.statusCommandServerId)
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
        try {
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
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error && interaction.replied) {
                interaction.editReply(err.message);
            } else if (err instanceof Error) {
                interaction.reply(err.message);
            } else {
                interaction.reply(String(err));
            }
        }
    }

    private async listServers(interaction: ChatInputCommandInteraction): Promise<void> {
        const servers = await this.minecraftServerProvider.getServers();

        const message = renderTemplate(
            this.i18n.serverList, {
                servers: servers.map(server => ({
                    ...server,
                    statusEmoji: this.getStatusEmoji(server.status),
                    statusSuffix: this.getStatusSuffix(server.status),
                    isRunning: server.status === ServerStatus.RUNNING,
                })),
            });
        await interaction.reply(message);
    }

    private async startServer(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverInfo = this.getServerInfo(interaction);
        await interaction.reply(renderTemplate(this.i18n.startCommandFeedback, serverInfo));
        await this.minecraftServerProvider.startServer(serverInfo.id);
    }

    private async stopServer(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverInfo = this.getServerInfo(interaction);
        await interaction.reply(renderTemplate(this.i18n.stopCommandFeedback, serverInfo));
        await this.minecraftServerProvider.stopServer(serverInfo.id);
    }

    private async getServerStatus(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverInfo = this.getServerInfo(interaction);
        const status = await this.minecraftServerProvider.getServerStatus(serverInfo.id);
        await interaction.reply(renderTemplate(this.i18n.serverStatus, {
            ...status,
            statusEmoji: this.getStatusEmoji(status.status),
            statusSuffix: this.getStatusSuffix(status.status),
            isRunning: status.status === ServerStatus.RUNNING,
        }));
    }

    private getServerInfo(interaction: ChatInputCommandInteraction): MinecraftServerInfo {
        const id = stripIdHashtag(interaction.options.getString('server-id', true));
        const serverInfo = this.serverInfos.find(server => server.id === id);
        if (!serverInfo) {
            throw new ServerNotFound(id);
        }
        return serverInfo;
    }

    private getStatusEmoji(status: ServerStatus): string {
        return this.i18n.statusEmoji[status];
    }

    private getStatusSuffix(status: ServerStatus): string {
        return this.i18n.statusSuffix[status];
    }
}

function stripIdHashtag(idArg: string): string {
    if (!idArg.startsWith('#')) {
        throw new Error(`Invalid server id: ${idArg}`);
    }
    return idArg.substring(1);
}
