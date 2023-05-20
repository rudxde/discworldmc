import { Client, Events, Interaction, Routes } from 'discord.js';
import { DiscordConfiguration } from './config';
import { DiscordCommandsManager } from './commands';
import { I18n } from '../i18n';
import { AuthorizedMinecraftServerProvider } from '../auth/inbound';


export class DiscordService {
    private readonly client: Client = new Client({ intents: [] });
    private readonly commandManager: DiscordCommandsManager;

    constructor(
        private readonly config: DiscordConfiguration,
        minecraftServerProvider: AuthorizedMinecraftServerProvider,
        i18n: I18n,
    ) {
        this.commandManager = new DiscordCommandsManager(minecraftServerProvider, i18n);
    }

    async start(): Promise<void> {
        await this.client.login(this.config.token);
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
}
