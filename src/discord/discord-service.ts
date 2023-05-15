import { Client, Events, Interaction, Routes } from 'discord.js';
import { DiscordConfiguration } from './config';
import { MinecraftServerProvider } from '../domain/inbound';
import { DiscordCommandsManager } from './commands';


export class DiscordService {
    private readonly client: Client = new Client({ intents: [] });
    private readonly commandManager: DiscordCommandsManager;

    constructor(
        private readonly config: DiscordConfiguration,
        minecraftServerProvider: MinecraftServerProvider,
    ) {
        this.commandManager = new DiscordCommandsManager(minecraftServerProvider);
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
