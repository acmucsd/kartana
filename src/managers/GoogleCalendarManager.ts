
import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { google } from 'googleapis';
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
     * Querying the calendar and sending notifications for all meetings happening this minute.
     *
     * 
     * We'll set the times to query the Google Calendar API for. 
     * Google Calendar API will select all events where timeMin < eventTime < timeMax. 
     * We want to get all events in the current minute, so we'll set 
     * startTime to be (min-1):59 and endTime to be (min):59.
     */
    const startTime = new Date();
    // JavaScript Date handles overflow for us, so we don't need special cases.
    startTime.setMinutes(startTime.getMinutes() - 1);
    startTime.setSeconds(59);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 1);

    calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      // TODO: Abstract this away to another function
      if (err) {
        // We'll report if there's an API error to deal with the issue.
        Logger.error('Error with Google Calendar API: ' + err);
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error with Google Calendar API!')
          .setDescription('' + err)
          .setColor('DARK_RED');
        // Figure out how to send to a specific channel from here.
        /*
        webhook.send({
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
            const start = event.start.dateTime || event.start.date;
            console.log(`Happening now: ${start} - ${event.summary}`);
          }
        });
      } else {
        console.log('No upcoming events found occurring right now.');
      }
    });

    /*
     * Querying the calendar and sending notifications for meetings happening an hour from now.
     */
    startTime.setHours(startTime.getHours() + 1);
    endTime.setHours(startTime.getHours() + 1);

    // Copy and pasted from a few lines earlier.
    calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      // TODO: Abstract this away to another function
      if (err) {
        // We'll report if there's an API error to deal with the issue.
        Logger.error('Error with Google Calendar API: ' + err);
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error with Google Calendar API!')
          .setDescription('' + err)
          .setColor('DARK_RED');
        // Figure out how to send to a specific channel from here.
        /*
        webhook.send({
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
            const start = event.start.dateTime || event.start.date;
            console.log(`One hour from now: ${start} - ${event.summary}`);
          }
        });
      } else {
        console.log('No upcoming events found occurring an hour from now.');
      }
    });
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