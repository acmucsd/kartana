import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Checks all Google Calendars for meetings happening this minute..
 * 
 * Doesn't disrupt the cronjob that runs every 15 minutes.
 */
export default class RefreshCalendar extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('refreshcalendar')
      .setDescription('Checks all Google Calendars for meetings happening this minute.');

    super(client, {
      name: 'refreshcalendar',
      boardRequired: true,
      enabled: true,
      description: 'Checks all Google Calendars for meetings happening this minute.',
      category: 'Utility',
      usage: client.settings.prefix.concat('refreshcalendar'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);
    await this.client.googleCalendarManager.runMeetingsPipeline(this.client);
    await super.edit(interaction, { content: 'Ran the meetings pipeline!', ephemeral: true });
  }
}
