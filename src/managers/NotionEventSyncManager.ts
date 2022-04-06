
import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { syncHostFormToNotionCalendar } from '../event-notion';
import { readFileSync } from 'fs';
import { MessageEmbed, WebhookClient } from 'discord.js';
import { GoogleSheetsSchemaMismatchError, NotionSchemaMismatchError } from '../types';

/**
 * NotionEventSyncManager manages the automatic import of new events on the Events
 * Host Form to the private board Notion Events calendar every 30 minutes.
 */
@Service()
export default class {
  /**
   * Cronjob to run Notion Event Sync Pipeline every 30 minutes.
   */
  public notionEventSyncJob!: schedule.Job;

  /**
   * Initialize the procedures involved to sync the Notion Events Calendar with the Events Host Form.
   * @param client The original client, for access to the configuration.
   */
  public initializeNotionSync(client: BotClient): void {
    const googleSheetKeyFile = readFileSync(client.settings.googleSheetsKeyFile);
    this.notionEventSyncJob = schedule.scheduleJob('*/30 * * * *', async () => {
      Logger.info('Running notion event pipeline sync cron job!');
      const webhook = new WebhookClient({ url: client.settings.discordWebhookURL });
      try {
        await syncHostFormToNotionCalendar({
          logisticsTeamId: client.settings.logisticsTeamID,
          maintainerId: client.settings.maintainerID,
          hostFormSheetId: client.settings.googleSheetsDocID,
          hostFormSheetName: client.settings.googleSheetsSheetName,
          notionCalendarId: client.settings.notionCalendarID,
          notionToken: client.settings.notionIntegrationToken,
          webhook,
          googleSheetAPICredentials: JSON.parse(googleSheetKeyFile.toString()),
        });
    
        // If the pipeline has run by now without throwing an Error, we must have
        // skipped any data schema related errors, so we can mark them off as fine.
        client.flags.validGoogleSchema = true;
        client.flags.validNotionSchema = true;
      } catch (e) {
        // If we got an error, one of our schemas is mismatched! We want to call that out
        // on Discord, ping both Events Team and the Kartana developer and deal with it later on.
        if (e instanceof NotionSchemaMismatchError) {
          // If not yet marked as invalid, don't deal with any of the logic.
          if (client.flags.validNotionSchema) {
            // Mark it off as invalid. We'll validate it later when we run through one pipeline run
            // with no thrown Errors.
            client.flags.validNotionSchema = false;
    
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
              content: `Paging <@&${client.settings.logisticsTeamID}> and <@${client.settings.maintainerID}>!`,
              embeds: [errorEmbed],
            });
          }
        } else if (e instanceof GoogleSheetsSchemaMismatchError) {
          // Similarly for this if statement, except this outputs an embed for the Google Sheets table error.
          if (client.flags.validGoogleSchema) {
            client.flags.validGoogleSchema = false;
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
              content: `Paging <@&${client.settings.logisticsTeamID}> and <@${client.settings.maintainerID}>!`,
              embeds: [errorEmbed],
            });
          }
        }
      }
    });
  }
}