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
  public calendar: calendar_v3.Calendar;

  /**
   * Cronjob to check for upcoming meetings every 15 minutes.
   */
  public meetingNotificationsJob!: schedule.Job;

  /**
   * Queries the calendar for events happening in the given time window and sends
   * messages to the calendar's respective Discord channel for each meeting.
   * @param client The original client, for access to the configuration.
   * @param calendarID The name of the specific calendar we're searching in. (ex. ACM General)
   * @param start Date object storing the start of the time window we are querying for.
   */
  private sendMeetingPings(client: BotClient, calendarID: string, start: DateTime): void {
    /**
     * The end of the time window of the query is one minute after the given start time.
     */
    const end = start.plus({ minutes: 1 });

    this.calendar.events.list({
      calendarId: calendarID,
      timeMin: start.toISO(),
      timeMax: end.toISO(),
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) {
        // We'll report if there's an API error to deal with the issue.
        Logger.error('Error with Google Calendar API: ' + err);
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error with Google Calendar API!')
          .setDescription('' + err)
          .setColor('DARK_RED');
        const channel = client.channels.cache.get('channelID') as TextChannel;
        channel.send({
          content: `*Paging <@${client.settings.maintainerID}>!*`,
          embeds: [errorEmbed],
        });
      } 
      // Check that there are events to send notifications for
      if (res && res.data.items) {
        const events = res.data.items;
        events.map((event, i) => {
          if (event && event.start) {
            // Send a specific embed for each meeting here
            const eventStart = event.start.dateTime || event.start.date;
            /** TODO: special text case for one hour from now, abstract embed building? */
            console.log(`Happening now: ${eventStart} - ${event.summary}`);
          }
        });
      } else {
        console.log('No upcoming events found occurring right now.');
      }
    });
  }

  /**
   * Checks and pings if there are any upcoming meetings on the Google Calendar
   * happening right now or one hour from now.
   * @param client The original client, for access to the configuration
   */
  public async runMeetingsPipeline(client: BotClient): Promise<void> {
    /* 
     * Google Calendar API selects all events where timeMin < eventTime < timeMax. 
     * We want to get all events in this current minute, so we'll set 
     * startTime to be (currentMinute-1):59.
     */
    const startTimeNow = DateTime.now().minus({ minutes: 1 }).set({ second: 59 });
    this.sendMeetingPings(client, '', startTimeNow);

    /*
     * We'll also send notifications for meetings happening a hour from now.
     */
    const startTimeOneHour = startTimeNow.plus({ hours: 1 });
    this.sendMeetingPings(client, '', startTimeOneHour);
    return;
  }

  /**
   * Initialize the procedures involved to send Discord notifications for 
   * upcoming meetings on the ACM Google Calendar.
   * @param client The original client, for access to the configuration.
   */
  public initializeMeetingPings(client: BotClient): void {
    this.meetingNotificationsJob = schedule.scheduleJob('*/15 * * * *', async () => {
      Logger.info('Running meeting notifications cronjob!');
      const auth = new google.auth.GoogleAuth({
        keyFilename: client.settings.googleSheetsKeyFile, 
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });
      const authClient = await auth.getClient();
      this.calendar = google.calendar({ version: 'v3', auth: authClient });
      this.runMeetingsPipeline(client);
    });
  }
}