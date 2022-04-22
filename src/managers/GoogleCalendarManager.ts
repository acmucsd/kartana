
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
    // Figure out date handling for timeMax.
    calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      timeMax: (new Date()).toISOString(),
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
        // Figure out how to send to a specific channel from here.
        /*
        webhook.send({
          content: `*Paging <@${client.settings.maintainerID}>!*`,
          embeds: [errorEmbed],
        });
        */
      } 
      if (res) {
        const events = res.data.items;
        // Make sure events isn't undefined and that there are events to report.
        if (events && events.length) {
          console.log('Upcoming 10 events:');
          events.map((event, i) => {
            if (event && event.start) {
              const start = event.start.dateTime || event.start.date;
              console.log(`${start} - ${event.summary}`);
            }
          });
        } else {
          console.log('No upcoming events found.');
        }
      }
    });
    return;
  }

  /**
   * Initialize the procedures involved to sync the Notion Events Calendar with the Events Host Form.
   * @param client The original client, for access to the configuration.
   */
  public initializeNotionSync(client: BotClient): void {
    this.meetingNotificationsJob = schedule.scheduleJob('*/15 * * * *', async () => {
      Logger.info('Running meeting notifications cron job!');
      this.runMeetingsPipeline(client);
    });
  }
}