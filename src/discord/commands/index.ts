import {
    ChatInputCommandInteraction, RESTPostAPIApplicationCommandsJSONBody,
    SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder,
} from 'discord.js';
import { MinecraftServerProvider } from '../../domain/inbound';
import { InvalidCommand } from '../../error/invalid-command';


export class DiscordCommandsManager {
    private readonly commandData = new SlashCommandBuilder()
        .setName('dw')
        .setDescription('Manage minecraft worlds')
        .setDefaultMemberPermissions('0')
        .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
            .setName('server')
            .setDescription('Commands regarding minecraft servers')
            .addSubcommand(new SlashCommandSubcommandBuilder()
                .setName('list')
                .setDescription('List available servers and if they are currently running'),
            ),
        );

    constructor(private readonly minecraftServerProvider: MinecraftServerProvider) { }

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
}
