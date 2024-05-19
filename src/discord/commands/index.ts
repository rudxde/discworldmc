import {
    ChatInputCommandInteraction,
    AutocompleteInteraction,
    GuildMember,
    RESTPostAPIApplicationCommandsJSONBody,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandsOnlyBuilder,
    BaseInteraction,
} from 'discord.js';
import { render as renderTemplate } from 'mustache';
import { AuthorizedMinecraftServerProvider } from '../../auth/inbound';
import { MinecraftServerInfo, ServerStatus } from '../../domain/entities/server';
import { BaseError } from '../../error/base-error';
import { InvalidCommand } from '../../error/invalid-command';
import { ServerNotFound } from '../../error/server-not-found';
import { I18n } from '../../i18n';
import { PossibleActions } from '../../domain/entities/possible-action';


export class DiscordCommandsManager {
    private readonly commandData: SlashCommandSubcommandsOnlyBuilder;
    private readonly serverInfos: MinecraftServerInfo[];

    constructor(
        private readonly minecraftServerProvider: AuthorizedMinecraftServerProvider,
        private readonly i18n: I18n,
    ) {
        this.serverInfos = this.minecraftServerProvider.getServerInfos();
        const serverChoices = this.serverInfos.map(server => ({
            name: server.id,
            value: `#${server.id}`,
        }));
        this.commandData = new SlashCommandBuilder()
            .setName('dw')
            .setDescription(this.i18n.commandDescriptions.rootCommand)
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
                        .setAutocomplete(true),
                    ),
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('status')
                    .setDescription(this.i18n.commandDescriptions.statusCommand)
                    .addStringOption(new SlashCommandStringOption()
                        .setName('server-id')
                        .setDescription(this.i18n.commandDescriptions.statusCommandServerId)
                        .setRequired(true)
                        .setAutocomplete(true),
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
                await interaction.deferReply();
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
            let message: string;
            if (err instanceof BaseError) {
                message = renderTemplate(this.i18n.errors[err.i18nEntry], err);
            } else {
                message = this.i18n.errors.unknown;
            }
            await this.replyOrEditInteraction(interaction, message);
        }
    }

    async handleAutocompleteCommand(interaction: AutocompleteInteraction): Promise<void> {
        try {
            if (interaction.commandName !== this.commandData.name) {
                throw new InvalidCommand(interaction.commandName);
            }
            const subcommandGroup = interaction.options.getSubcommandGroup(true);
            if (subcommandGroup !== 'server') {
                throw new InvalidCommand(`${interaction.commandName} ${subcommandGroup}`);
            }
            const subcommand = interaction.options.getSubcommand(true);
            const subCommandIsPossibleAction = Object.values(PossibleActions).indexOf(subcommand as PossibleActions) !== -1;
            if (!subCommandIsPossibleAction) {
                throw new InvalidCommand(`${interaction.commandName} ${subcommandGroup} ${subcommand}`);
            }
            await this.autoCompleteServer(interaction, subcommand as PossibleActions);
        } catch (err: unknown) {
            console.error(err);
            let message: string;
            if (err instanceof BaseError) {
                message = renderTemplate(this.i18n.errors[err.i18nEntry], err);
            } else {
                message = this.i18n.errors.unknown;
            }
            await interaction.respond([]);
        }
    }

    private async listServers(interaction: ChatInputCommandInteraction): Promise<void> {
        const memberRoles = await this.getMemberRoles(interaction);
        const servers = await this.minecraftServerProvider.getServers(memberRoles);

        const message = renderTemplate(
            this.i18n.serverList, {
                servers: servers.map(server => ({
                    ...server,
                    statusEmoji: this.getStatusEmoji(server.status),
                    statusSuffix: this.getStatusSuffix(server.status),
                    isRunning: server.status === ServerStatus.RUNNING,
                })),
            });
        await this.replyOrEditInteraction(interaction, message);
    }

    private async startServer(interaction: ChatInputCommandInteraction): Promise<void> {
        const memberRoles = await this.getMemberRoles(interaction);
        const serverInfo = this.getServerInfo(interaction);
        await this.minecraftServerProvider.startServer(serverInfo.id, memberRoles);
        await this.replyOrEditInteraction(interaction, renderTemplate(this.i18n.startCommandFeedback, serverInfo));
    }

    private async stopServer(interaction: ChatInputCommandInteraction): Promise<void> {
        const memberRoles = await this.getMemberRoles(interaction);
        const serverInfo = this.getServerInfo(interaction);
        await this.minecraftServerProvider.stopServer(serverInfo.id, memberRoles);
        await this.replyOrEditInteraction(interaction, renderTemplate(this.i18n.stopCommandFeedback, serverInfo));
    }

    private async autoCompleteServer(interaction: AutocompleteInteraction, action: PossibleActions): Promise<void> {
        const memberRoles = await this.getMemberRoles(interaction);
        const allowedServers = this.minecraftServerProvider.getAllowedServerInfosForPermissions(memberRoles, action);
        const focusedValue = interaction.options.getFocused();
        let filteredServers = allowedServers;
        if (focusedValue) {
            filteredServers = allowedServers.filter(server => server.id.includes(focusedValue));
        }
        await interaction.respond(filteredServers.map(server => ({
            name: server.id,
            value: `#${server.id}`,
        })));
    }

    private async getServerStatus(interaction: ChatInputCommandInteraction): Promise<void> {
        const memberRoles = await this.getMemberRoles(interaction);
        const serverInfo = this.getServerInfo(interaction);
        const status = await this.minecraftServerProvider.getServerStatus(serverInfo.id, memberRoles);
        await this.replyOrEditInteraction(interaction, renderTemplate(this.i18n.serverStatus, {
            ...status,
            statusEmoji: this.getStatusEmoji(status.status),
            statusSuffix: this.getStatusSuffix(status.status),
            isRunning: status.status === ServerStatus.RUNNING,
        }));
    }

    private async getMemberRoles(interaction: BaseInteraction): Promise<string[]> {
        const member = interaction.member;
        if (!member) {
            throw new Error('Received interaction with unexpected type for \'member\'');
        }
        if (!(member instanceof GuildMember)) {
            return member.roles;
        }
        await interaction.guild?.roles.fetch();
        const roleIds = member.roles.cache.map(role => role.id);
        return roleIds;
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

    private async replyOrEditInteraction(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(message);
        } else {
            await interaction.reply(message);
        }
    }
}

function stripIdHashtag(idArg: string): string {
    if (!idArg.startsWith('#')) {
        throw new Error(`Invalid server id: ${idArg}`);
    }
    return idArg.substring(1);
}
