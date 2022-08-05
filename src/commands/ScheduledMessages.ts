import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';


export default class SchueduledMessages extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('schedule')
      .setDescription('sends a scheduled message')
      .addStringOption((option) => option
        .setName('message')
        .setDescription('message to be sent')
        .setRequired(true))
      .addStringOption((option) => option
        .setName('date')
        .setDescription('enter date in mm/dd/yyyy format. else it will default to current day')
        .setRequired(false))
      .addIntegerOption((option) => option
        .setName('hour')
        .setDescription('enter hour to be sent 0-23')
        .setRequired(true))
      .addIntegerOption((option) => option
        .setName('minute')
        .setDescription('enter minute 0-59')
        .setRequired(true))
      .addUserOption((option) => option
        .setName('users')
        .setDescription('enter ids to be pinged')
        .setRequired(false));

 
    super(client, {
      name: 'schedule',
      boardRequired: true,
      enabled: true,
      description: 'sends a scheduled message',
      category: 'Utility',
      usage: client.settings.prefix.concat('schedule <message> <date> <hour> <minute> '),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }
  
  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);

    const message = interaction.options.getString('message', true);

    await super.respond(interaction, message);

  }
}