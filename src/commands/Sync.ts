import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed, WebhookClient } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { syncHostFormToNotionCalendar } from '../event-notion';
import { readFileSync } from 'fs';
import { GoogleSheetsSchemaMismatchError, NotionSchemaMismatchError } from '../types';

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
    const googleSheetKeyFile = readFileSync(process.env.GOOGLE_SHEETS_KEY_FILE);
    const webhook = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
    try {
      await syncHostFormToNotionCalendar({
        logisticsTeamId: this.client.settings.logisticsTeamID,
        maintainerId: this.client.settings.maintainerID,
        hostFormSheetId: this.client.settings.googleSheetsDocID,
        hostFormSheetName: this.client.settings.googleSheetsSheetName,
        notionCalendarId: this.client.settings.notionCalendarID,
        notionToken: this.client.settings.notionIntegrationToken,
        webhook,
        googleSheetAPICredentials: JSON.parse(googleSheetKeyFile.toString()),
      });

      // If the pipeline has run by now without throwing an Error, we must have
      // skipped any data schema related errors, so we can mark them off as fine.
      this.client.flags.validGoogleSchema = true;
      this.client.flags.validNotionSchema = true;
      super.respond(interaction, 'Manual sync run!');
    } catch (e) {
      // If we got an error, one of our schemas is mismatched! We want to call that out
      // on Discord, ping both Events Team and the Kartana developer and deal with it later on.
      if (e instanceof NotionSchemaMismatchError) {
        // If not yet marked as invalid, don't deal with any of the logic.
        if (this.client.flags.validNotionSchema) {
          // Mark it off as invalid. We'll validate it later when we run through one pipeline run
          // with no thrown Errors.
          this.client.flags.validNotionSchema = false;

          // Send the error out on Discord. If we're in this "if", it means we've
          // not sent it before, so we'll only send once total between schema changes
          // (or restarts).
          const errorEmbed = new MessageEmbed()
            .setTitle('🚫 Notion database changed!')
            .setDescription(`Changes found in database:\n\`\`\`json\n${JSON.stringify(e.diff, null, 2)}\n\`\`\``)
            .setFooter({
              text: "I will not run the pipeline again until y'all confirm the Notion database changes.",
            })
            .setColor('DARK_RED');
          await webhook.send({
            // No point in making this line shorter.
            // eslint-disable-next-line max-len
            content: `Paging <@&${this.client.settings.logisticsTeamID}> and <@${this.client.settings.maintainerID}>!`,
            embeds: [errorEmbed],
          });
        }
        super.respond(interaction, 'Notion schema mismatch!');
      } else if (e instanceof GoogleSheetsSchemaMismatchError) {
        // Similarly for this if statement, except this outputs an embed for the Google Sheets table error.
        if (this.client.flags.validGoogleSchema) {
          this.client.flags.validGoogleSchema = false;
          const errorEmbed = new MessageEmbed()
            .setTitle('🚫 Google Sheets table columns changed!')
            .setDescription(`Changes found in table:\n\`\`\`json\n${JSON.stringify(e.diff, null, 2)}\n\`\`\``)
            .setFooter({
              text: "I will not run the pipeline again until y'all confirm the Google Sheets table changes.",
            })
            .setColor('DARK_RED');
          await webhook.send({
            // No point in making this line shorter.
            // eslint-disable-next-line max-len
            content: `Paging <@&${this.client.settings.logisticsTeamID}> and <@${this.client.settings.maintainerID}>!`,
            embeds: [errorEmbed],
          });
        }
        super.respond(interaction, 'Google sheets schema mismatch!');
      }
    }
  }
}
