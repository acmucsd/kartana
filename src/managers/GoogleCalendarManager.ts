import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { DateTime, Interval } from 'luxon';
import { calendar_v3, google } from 'googleapis';
import { MessageEmbed, TextChannel } from 'discord.js';
import { MeetingPingsSchema,  DiscordInfo } from '../meeting-pings';

/**
 * GoogleCalendarManager manages automatic event notifications on Discord of events on
 * the calendar that are occuring 1 hour from the current time or at the current time.
 */
@Service()
export default class {
  /**
   * The Google Calendar Client that allows us to interact with the API.
   */
  private calendar: calendar_v3.Calendar;

  /**
   * Cronjob to check for upcoming meetings every 15 minutes.
   */
  public meetingNotificationsJob!: schedule.Job;

  /**
   * List of all calendarIDs to search through when checking for upcoming events.
   */
  public calendarList: string[];

  /**
   * Mapping from each calendarID to the specific channel/people to notify for each event.
   */
  public calendarMapping: Map<string, DiscordInfo>;

  /**
   * Updates the Google Calendar auth and client before an API call.
   * @param client The original client, for access to the configuration.
   */
  private async refreshAuth(client: BotClient) : Promise<void> {
    const auth = new google.auth.GoogleAuth({
      keyFilename: client.settings.googleSheetsKeyFile, 
      scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar'],
    });
    const authClient = await auth.getClient();
    this.calendar = google.calendar({ version: 'v3', auth: authClient });
  }

  /**
   * Queries all calendars for events happening in the given time window and sends
   * messages to the calendar's respective Discord channel for each meeting.
   * @param client The original client, for access to the configuration.
   * @param start Date object storing the start of the time window we are querying for.
   */
  private async sendMeetingPings(client: BotClient, start: DateTime): Promise<void> {
    /**
     * The end of the time window of the query is one minute after the given start time.
     */
    const end = start.plus({ minutes: 1 });
    /**
     * Checking through all calendars in our calendar list...
     */
    this.calendarList.map(async calendarID => {
      const res = await this.calendar.events.list({
        calendarId: calendarID,
        timeMin: start.toISO(),
        timeMax: end.toISO(),
        singleEvents: true,
        orderBy: 'startTime',
      });
  
      // Check that there are events to send notifications for
      if (res && res.data.items) {
        const events = res.data.items;
        events.map((event, i) => {
          if (event && event.start && event.end && event.start.dateTime && event.end.dateTime) {
            // Send a specific embed for each meeting to the specified channel.
            const startTime = DateTime.fromISO(event.start.dateTime);
            const endTime = DateTime.fromISO(event.end.dateTime);
            const searchInterval = Interval.fromDateTimes(start, end);
            // We only send embeds for events that are just starting in our time window.
            if (searchInterval.contains(startTime)) {
              const mentions = this.calendarMapping[calendarID].getMentions();
              let messageEmbed = new MessageEmbed()
                .setTitle('🗓️ ' + (event.summary || 'Untitled Event'))
                .setDescription(event.description || '')
                .addField('⏰ Time', 
                  `<t:${Math.trunc(startTime.toSeconds())}:F> to <t:${Math.trunc(endTime.toSeconds())}:F>`)
                .addField('👥 People', mentions)
                .setColor('BLUE');
              if (event.location) {
                messageEmbed = messageEmbed.addField('📍 Location', event.location);
              }
              const channel = client.channels.cache.get(this.calendarMapping[calendarID].getChannelID()) as TextChannel;
              channel.send({
                content: `${mentions} Meeting starting <t:${Math.trunc(startTime.toSeconds())}:R>!`,
                embeds: [messageEmbed],
              });
            }
          }
        });
      } else {
        Logger.info('No upcoming events found occurring right now.');
      }
    });
  }

  /**
   * Checks and pings if there are any upcoming meetings on the Google Calendar
   * happening right now or one hour from now.
   * @param client The original client, for access to the configuration
   */
  public async runMeetingsPipeline(client: BotClient): Promise<void> {
    try {
      /* 
      * Google Calendar API selects all events where timeMin < eventTime < timeMax. 
      * We want to get all events in this current minute, so we'll set 
      * startTime to be (currentMinute-1):59.
      */
      const now = DateTime.now().minus({ minutes: 1 }).set({ second: 59 });
      this.sendMeetingPings(client, now);

      /*
      * We'll also send notifications for meetings happening a hour from now.
      */
      const oneHourFromNow = now.plus({ hours: 1 });
      this.sendMeetingPings(client, oneHourFromNow);

    } catch (err) {
      // We'll report if there's an API error to deal with the issue.
      Logger.error('Error with Google Calendar API: ' + err);
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error with Google Calendar API!')
        .setDescription('' + err)
        .setColor('DARK_RED');
      const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
      channel.send({
        content: `*Paging <@${client.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
    }
  }

  /**
   * Initialize the procedures involved to send Discord notifications for 
   * upcoming meetings on the ACM Google Calendar.
   * @param client The original client, for access to the configuration.
   */
  public async initializeMeetingPings(client: BotClient): Promise<void> {
    await this.refreshAuth(client);
    this.calendarList = [];
    this.calendarMapping = new Map<string, DiscordInfo>();
    for (const entry of MeetingPingsSchema) {
      this.calendarList.push(entry.calendarID);
      this.calendarMapping[entry.calendarID] = new DiscordInfo(entry.channelID, entry.mentions);
      Logger.info(`Successfully imported calendar ${entry.name}`);
      try {
        await this.calendar.calendarList.insert({ requestBody: { id: entry.calendarID } });
      } catch (err) {
        // We'll report if there's an API error to deal with the issue.
        Logger.error(`Error importing calendar ${entry.name}: ${err}`);
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error with Google Calendar API!')
          .setDescription(`Error importing calendar ${entry.name}: ${err}`)
          .setColor('DARK_RED');
        const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
        channel.send({
          content: `*Paging <@${client.settings.maintainerID}>!*`,
          embeds: [errorEmbed],
        });
      }
    }
    this.meetingNotificationsJob = schedule.scheduleJob('*/15 * * * *', async () => {
      Logger.info('Running meeting notifications cronjob!');
      await this.refreshAuth(client);
      await this.runMeetingsPipeline(client);
      Logger.info('Finished running meeting notifications cronjob!');
    });
  }
}