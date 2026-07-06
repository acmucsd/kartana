import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { syncHostFormToNotionCalendar, pingForDeadlinesAndReminders, pingForPEEFReminders } from '../event-notion';
import { readFileSync } from 'fs';
import { MessageEmbed, TextChannel } from 'discord.js';
import { GoogleSheetsSchemaMismatchError, NotionSchemaMismatchError } from '../types';
import { generateNewNote } from '../notes-notion';
import { DateTime } from 'luxon';

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
   * Cronjob to run TAP Deadline Pings every day at 10 AM.
   */
  public deadlineReminderPingJob: schedule.Job;

  /**
   * Cronjob to run PEEF host reminders and finance completion pings.
   */
  public peefReminderPingJob: schedule.Job;

  public googleSheetKeyFile: Buffer;

  private async handleNotionSchemaMismatch(client: BotClient, eventChannel: TextChannel, diff: unknown): Promise<void> {
    if (!client.flags.validNotionSchema) {
      return;
    }

    client.flags.validNotionSchema = false;

    const errorEmbed = new MessageEmbed()
      .setTitle('🚫 Notion database changed!')
      .setDescription(`Changes found in database:\n\`\`\`json\n${JSON.stringify(diff, null, 2)}\n\`\`\``.slice(0, 4095))
      .setFooter("I won't run any Notion-related pipelines again until the Notion database changes are confirmed.")
      .setColor('DARK_RED');

    await eventChannel.send({
      content: `Paging <@&${client.settings.logisticsTeamID}> and <@&${client.settings.maintainerID}>!`,
      embeds: [errorEmbed],
    });
  }

  /**
   * Imports new events on the Events Host Form to the private board Notion Events calendar.
   * @param client The original client, for access to the configuration
   */
  public async runNotionPipeline(client: BotClient): Promise<void> {
    const eventChannel = client.channels.cache.get(client.settings.discordEventPipelineChannelID) as TextChannel;
    try {
      await syncHostFormToNotionCalendar({
        settings: client.settings,
        channel: eventChannel,
        googleSheetAPICredentials: JSON.parse(this.googleSheetKeyFile.toString()),
      });

      // If the pipeline has run by now without throwing an Error, we must have
      // skipped any data schema related errors, so we can mark them off as fine.
      client.flags.validGoogleSchema = true;
      client.flags.validNotionSchema = true;
    } catch (e) {
      // If we got an error, one of our schemas is mismatched! We want to call that out
      // on Discord, ping both Events Team and the Kartana developer and deal with it later on.
      if (e instanceof NotionSchemaMismatchError) {
        await this.handleNotionSchemaMismatch(client, eventChannel, e.diff);
      } else if (e instanceof GoogleSheetsSchemaMismatchError) {
        // Similarly for this if statement, except this outputs an embed for the Google Sheets table error.
        if (client.flags.validGoogleSchema) {
          client.flags.validGoogleSchema = false;
          const errorEmbed = new MessageEmbed()
            .setTitle('🚫 Google Sheets table columns changed!')
            .setDescription(
              `Changes found in table:\n\`\`\`json\n${JSON.stringify(e.diff, null, 2)}\n\`\`\``.slice(0, 4095),
            )
            .setFooter("I will not run the pipeline again until y'all confirm the Google Sheets table changes.")
            .setColor('DARK_RED');
          await eventChannel.send({
            content: `Paging <@&${client.settings.logisticsTeamID}> and <@&${client.settings.maintainerID}>!`,
            embeds: [errorEmbed],
          });
        }
      }
    }
  }

  /**
   * Checks and pings if there are any upcoming TAP deadlines.
   * @param client The original client, for access to the configuration
   */
  public async runDeadlinesAndReminders(client: BotClient): Promise<void> {
    const eventChannel = client.channels.cache.get(client.settings.discordEventPipelineChannelID) as TextChannel;
    try {
      await pingForDeadlinesAndReminders({
        settings: client.settings,
        channel: eventChannel,
        googleSheetAPICredentials: JSON.parse(this.googleSheetKeyFile.toString()),
      });

      // If the pipeline has run by now without throwing an Error, we must have
      // skipped any data schema related errors, so we can mark them off as fine.
      //
      // Note for this pipeline we don't check the Google sheets, so only mark Notion
      // as good.
      client.flags.validNotionSchema = true;
    } catch (e) {
      // If we got an error, our schemas are mismatched! We want to call that out
      // on Discord, ping both Events Team and the Kartana developer and deal with it later on.
      if (e instanceof NotionSchemaMismatchError) {
        await this.handleNotionSchemaMismatch(client, eventChannel, e.diff);
      }
    }
  }

  /**
   * Checks and pings for any pending PEEF reminders and completions.
   * @param client The original client, for access to the configuration
   */
  public async runPEEFReminders(client: BotClient): Promise<void> {
    const eventChannel = client.channels.cache.get(client.settings.discordEventPipelineChannelID) as TextChannel;
    try {
      await pingForPEEFReminders({
        settings: client.settings,
        channel: eventChannel,
        googleSheetAPICredentials: JSON.parse(this.googleSheetKeyFile.toString()),
      });

      client.flags.validNotionSchema = true;
    } catch (e) {
      if (e instanceof NotionSchemaMismatchError) {
        await this.handleNotionSchemaMismatch(client, eventChannel, e.diff);
      }
    }
  }

  /**
   * Creates a new meeting note in Board Notion Meeting Notes and returns a link to it.
   * @param client client The original client, for access to the configuration
   * @param title The title of the Note to be created.
   * @param date The date the Note was created.
   * @returns A link to the newly created meeting note on Notion.
   */
  public async generateMeetingNotes(client: BotClient, title: string, date: DateTime): Promise<string> {
    try {
      const url = await generateNewNote({
        noteTitle: title,
        noteDate: date,
        notionNotesId: client.settings.notionMeetingNotesID,
        notionToken: client.settings.notionIntegrationToken,
      });
      return url;
    } catch (err) {
      Logger.error(`Error generating new meeting note: ${err}`);
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error with Notion Meeting Notes!')
        .setDescription(`Error generating new meeting note ${title}: ${err}`)
        .setColor('DARK_RED');
      const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
      channel.send({
        content: `*Paging <@&${client.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
      return '';
    }
  }

  /**
   * Initialize the procedures involved to sync the Notion Events Calendar with the Events Host Form.
   * @param client The original client, for access to the configuration.
   */
  public initializeNotionSync(client: BotClient): void {
    this.googleSheetKeyFile = JSON.parse(client.settings.googleSheetsKeyFile);
    this.notionEventSyncJob = schedule.scheduleJob('*/30 * * * *', async () => {
      Logger.info('Running notion event pipeline sync cron job!');
      this.runNotionPipeline(client);
    });
    this.deadlineReminderPingJob = schedule.scheduleJob('0 10 * * *', async () => {
      Logger.info('Running TAP deadline pings cron job!');
      this.runDeadlinesAndReminders(client);
    });
    this.peefReminderPingJob = schedule.scheduleJob('* * * * *', async () => {
      Logger.info('Running PEEF reminders cron job!');
      this.runPEEFReminders(client);
    });
  }
}
