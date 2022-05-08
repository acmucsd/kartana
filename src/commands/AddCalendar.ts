import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Adds the given calendarID to the list of Google Calendars to send meeting pings for.
 * 
 * Doesn't disrupt the cronjob that runs every 15 minutes.
 */
export default class AddCalendar extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('addcalendar')
      .addStringOption((option) => option.setName('calendarid').setDescription('Google Calendar ID').setRequired(true))
      .setDescription('Adds the given calendarID to the list of Google Calendars to send meeting pings for.');

    super(client, {
      name: 'addcalendar',
      boardRequired: true,
      enabled: true,
      description: 'Adds the given calendarID to the list of Google Calendars to send meeting pings for.',
      category: 'Utility',
      usage: client.settings.prefix.concat('addcalendar <calendarid>'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);
    const calendarID = interaction.options.getString('calendarid', true);
    const res = await this.client.googleCalendarManager.addCalendar(this.client, calendarID);
    await super.edit(interaction, { content: res, ephemeral: true });
  }
}
