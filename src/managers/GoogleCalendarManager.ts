
import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { calendar_v3, google } from 'googleapis';
import { MessageEmbed } from 'discord.js';

/**
 * GoogleCalendarManager manages automatic event notifications on Discord of events on
 * the calendar that are occuring 1 hour from the current time or at the current time.
 */
@Service()
export default class {
  /**
   * Cronjob to check for upcoming meetings every 15 minutes.
   */
  public meetingNotificationsJob!: schedule.Job;

  /** 
   * Cronjob maintaining the API token refreshing for Google Calendar API calls.
   */
  public googleTokenRefreshJob!: schedule.Job;

  /**
   * Queries the calendar for events happening in the given time window and sends
   * messages to the calendar's respective Discord channel for each meeting.
   * @param client The original client, for access to the configuration.
   * @param calendar The Google Calendar to make queries on.
   * @param calendarID The name of the specific calendar we're searching in. (ex. ACM General)
   * @param start Date object storing the start of the time window we are querying for.
   */
  private sendMeetingPings(client: BotClient, calendar: calendar_v3.Calendar, calendarID: string, start: Date): void {
    /**
     * We're setting the end of the time window of the query to be one minute after start.
     */
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 1);

    calendar.events.list({
      calendarId: calendarID,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
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
        /** TODO: Set a mapping from calendarID to the channel ID.
        const channel = client.channels.cache.get(channelID);
        channel.send({
          content: `*Paging <@${client.settings.maintainerID}>!*`,
          embeds: [errorEmbed],
        });
        */
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
   * Checks and pings if there are any upcoming meetings.
   * Currently logs the next 10 events on the calendar.
   * TODO: add client_id, client_secret, and redirect_uris to envvars.
   * @param client The original client, for access to the configuration
   */
  public async runMeetingsPipeline(client: BotClient): Promise<void> {
    const clientId = '';
    const clientSecret = '';
    const redirectUri = '';
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const calendar = google.calendar( { version: 'v3', auth } );

    /* 
     * Google Calendar API selects all events where timeMin < eventTime < timeMax. 
     * We want to get all events in this current minute, so we'll set 
     * startTime to be (currentMinute-1):59.
     */
    const startTime = new Date();
    // JavaScript Date handles overflow for us, so we don't need to handle any special cases.
    startTime.setMinutes(startTime.getMinutes() - 1);
    startTime.setSeconds(59);
    this.sendMeetingPings(client, calendar, '', startTime);

    /*
     * Sending notifications for meetings happening a hour from now.
     */
    startTime.setHours(startTime.getHours() + 1);
    this.sendMeetingPings(client, calendar, '', startTime);
    return;
  }

  /**
   * Initialize the procedures involved to send Discord notifications for 
   * upcoming meetings on the ACM Google Calendar.
   * @param client The original client, for access to the configuration.
   */
  public initializeMeetingPings(client: BotClient): void {
    this.meetingNotificationsJob = schedule.scheduleJob('*/15 * * * *', async () => {
      Logger.info('Running meeting notifications cron job!');
      this.runMeetingsPipeline(client);
    });
  }
}