import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { DateTime } from 'luxon';
import { calendar_v3, google } from 'googleapis';
import { MessageEmbed, TextChannel } from 'discord.js';

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
   * @param message The pre-built MessageEmbed we will send to Discord for each meeting notification.
   */
  private async sendMeetingPings(client: BotClient, start: DateTime, message: MessageEmbed): Promise<void> {
    /**
     * The end of the time window of the query is one minute after the given start time.
     */
    const end = start.plus({ minutes: 30 });

    const calendarList = await this.calendar.calendarList.list();
    /**
     * Checking through all calendars in our calendar list...
     */
    if (calendarList.data.items) {
      calendarList.data.items.map(async calendar => {
        const res = await this.calendar.events.list({
          calendarId: calendar.id as string,
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
              // Send a specific embed for each meeting to the specified channel
              const startTime = DateTime.fromISO(event.start.dateTime);
              /**
              const searchInterval = Interval.fromDateTimes(start, end);
              if (searchInterval.contains(startTime)) {} 
              */
              const endTime = DateTime.fromISO(event.end.dateTime);
              const messageEmbed = message
                .setTitle(event.summary || 'Untitled Event')
                .setDescription(event.description || '')
                .addField('Time', 
                  `<t:${Math.trunc(startTime.toSeconds())}:F> to <t:${Math.trunc(endTime.toSeconds())}:F>`)
                .addField('People', 'asdf')
                .setColor('BLUE');
              const channel = client.channels.cache.get('964648119184814152') as TextChannel;
              // TODO: Add mentions to embed
              channel.send({
                content: `Meeting happening <t:${Math.trunc(startTime.toSeconds())}:R>!`,
                embeds: [messageEmbed],
              });
            }
          });
        } else {
          console.log('No upcoming events found occurring right now.');
        }
      });
    }
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
      let message = new MessageEmbed().setTitle('Event happening now!');
      this.sendMeetingPings(client, now, message);

      /*
      * We'll also send notifications for meetings happening a hour from now.
      */
      const oneHourFromNow = now.plus({ hours: 1 });
      message = new MessageEmbed().setTitle('Event happening in one hour!');
      this.sendMeetingPings(client, oneHourFromNow, message);

    } catch (err) {
      // We'll report if there's an API error to deal with the issue.
      Logger.error('Error with Google Calendar API: ' + err);
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error with Google Calendar API!')
        .setDescription('' + err)
        .setColor('DARK_RED');
      const channel = client.channels.cache.get('964648119184814152') as TextChannel;
      /**
      channel.send({
        content: `*Paging <@${client.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
      */
      channel.send({
        content: 'Error!',
        embeds: [errorEmbed],
      });
    }
  }

  /**
   * Attempts to add a new calendar to the list of calendars to send meeting pings for.
   * @param client The original client, for access to the configuration.
   * @param calendarID ID of the Google Calendar. Found through Google Calendar Settings -> Integrate calendar.
   * @returns The response to original command, with information on the result of the API call.
   */
  public async addCalendar(client: BotClient, calendarID: string) : Promise<string> {
    await this.refreshAuth(client);
    this.runMeetingsPipeline(client);
    try {
      await this.calendar.calendarList.insert({ requestBody: { id: calendarID } });
      return 'Succesfully added calendar!';
    } catch (err) {
      return err + ' Tip: Make sure the calendar\'s shared with the Kartana service account first!';
    }
  }

  /**
   * Initialize the procedures involved to send Discord notifications for 
   * upcoming meetings on the ACM Google Calendar.
   * @param client The original client, for access to the configuration.
   */
  public initializeMeetingPings(client: BotClient): void {
    this.meetingNotificationsJob = schedule.scheduleJob('*/15 * * * *', async () => {
      Logger.info('Running meeting notifications cronjob!');
      this.refreshAuth(client);
      this.runMeetingsPipeline(client);
    });
  }
}