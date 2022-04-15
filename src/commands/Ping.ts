import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Pings the user.
 * Copied verbatim from BreadBot.
 *
 * Test Command left from the boilerplate.
 */
export default class Ping extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Pings the bot.');

    super(client, {
      name: 'ping',
      enabled: true,
      description: 'Pings the bot.',
      category: 'Information',
      usage: client.settings.prefix.concat('ping'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.respond(interaction, 'Pong!');
  }
}
