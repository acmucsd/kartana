import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Manually syncs the Event Host Form with the Notion Events calendar. 
 * 
 * Doesn't disrupt the cronjob that runs every 30 minutes.
 */
export default class Sync extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('sync')
      .setDescription('Triggers Notion Event Sync pipeline manually.');

    super(client, {
      name: 'sync',
      boardRequired: true,
      enabled: true,
      description: 'Triggers Notion Event Sync pipeline manually.',
      category: 'Utility',
      usage: client.settings.prefix.concat('sync'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);
    await this.client.notionEventSyncManager.runNotionPipeline(this.client);
    await super.edit(interaction, { content: 'Ran the Notion Sync Pipeline!', ephemeral: true });
  }
}
