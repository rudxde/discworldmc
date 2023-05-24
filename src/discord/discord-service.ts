import { Client, Events, Interaction, Routes } from 'discord.js';
import { render as renderTemplate } from 'mustache';
import { AuthorizedMinecraftServerProvider } from '../auth/inbound';
import { ServerEvent } from '../domain/inbound';
import { I18n } from '../i18n';
import { DiscordCommandsManager } from './commands';
import { DiscordConfiguration } from './config';


export class DiscordService {
    private readonly client: Client = new Client({ intents: [] });
    private readonly commandManager: DiscordCommandsManager;

    constructor(
        private readonly config: DiscordConfiguration,
        private readonly minecraftServerProvider: AuthorizedMinecraftServerProvider,
        private readonly i18n: I18n,
    ) {
        this.commandManager = new DiscordCommandsManager(minecraftServerProvider, i18n);
    }

    async start(): Promise<void> {
        await this.client.login(this.config.token);
        this.minecraftServerProvider.onServerEvent(this.onMinecraftServerEvent.bind(this));
        console.log('discord-service: Registering commands');
        await this.client.rest.post(
            Routes.applicationGuildCommands(this.config.appId, this.config.guildId),
            { body: this.commandManager.getCommandJSON() },
        );
        console.log('discord-service: Waiting for events');
        this.client.on(
            Events.InteractionCreate,
            interaction => this.handleInteraction(interaction),
        );
    }

    async handleInteraction(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        await this.commandManager.handleChatCommand(interaction);
    }

    onMinecraftServerEvent(serverId: string, reason: ServerEvent): void {
        let message: string;
        if (reason === ServerEvent.STARTED) {
            message = renderTemplate(this.i18n.serverStartup, { serverId });
        } else if (reason === ServerEvent.STOPPED) {
            message = renderTemplate(this.i18n.serverShutdown, { serverId });
        } else {
            throw new Error(`DiscordService received an invalid ServerEvent: ${reason}`);
        }
        this.client.rest.post(
            Routes.channelMessages(this.config.defaultMessageChannelId),
            { body: JSON.stringify({ content: message }) },
        );
    }
}
