import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Manually syncs the Event Host Form with the Notion Events calendar. 
 * 
 * Doesn't disrupt the cronjob that runs every 30 minutes.
 */
export default class Deadlines extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('deadlines')
      .setDescription('Pings for any upcoming TAP and CSI deadlines and key reminders manually.');

    super(client, {
      name: 'deadlines',
      boardRequired: true,
      enabled: true,
      description: 'Pings for any upcoming TAP and CSI deadlines and key reminders manually.',
      category: 'Utility',
      usage: client.settings.prefix.concat('deadlines'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);
    await this.client.notionEventSyncManager.runDeadlinesAndReminders(this.client);
    await super.edit(interaction, { content: 'Ran the TAP and CSI reminders!', ephemeral: true });
  }
}
