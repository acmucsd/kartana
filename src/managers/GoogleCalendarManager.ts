
import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { calendar_v3, google } from 'googleapis';
import { MessageEmbed } from 'discord.js';
import readline from 'readline';

/**
 * GoogleCalendarManager manages automatic event notifications on Discord of events on
 * the calendar that are occuring 1 hour from the current time or at the current time.
 */
@Service()
export default class {
  /**
   * The API token to authorize requests to the Google Calendar API.
   */
  public googleAPIToken: string | null | undefined = '';

  /**
   * The Google Calendar Client that allows us to interact with the API.
   */
  public calendar: calendar_v3.Calendar;

  /**
   * Cronjob to check for upcoming meetings every 15 minutes.
   */
  public meetingNotificationsJob!: schedule.Job;

  /** 
   * Cronjob maintaining the API token refreshing for Google Calendar API calls.
   * Runs every 30 minutes.
   */
  public googleTokenRefreshJob!: schedule.Job;

  /**
   * Queries the calendar for events happening in the given time window and sends
   * messages to the calendar's respective Discord channel for each meeting.
   * @param client The original client, for access to the configuration.
   * @param calendarID The name of the specific calendar we're searching in. (ex. ACM General)
   * @param start Date object storing the start of the time window we are querying for.
   */
  private sendMeetingPings(client: BotClient, calendarID: string, start: Date): void {
    /**
     * The end of the time window of the query is one minute after the given start time.
     */
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 1);

    this.calendar.events.list({
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
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - 1);
    startTime.setSeconds(59);
    this.sendMeetingPings(client, '', startTime);

    /*
     * We'll also send notifications for meetings happening a hour from now.
     */
    startTime.setHours(startTime.getHours() + 1);
    this.sendMeetingPings(client, '', startTime);
    return;
  }

  /**
   * Attempts to refresh the access token for the Google Calendar API and store it in 
   * this.googleAPIToken. If it can't automatically refresh the token, prompts for 
   * a maintainer to manually confirm access to the API and input the token.
   * @param client The original client, for accesss to the configuration
   */
  public async refreshAPIToken(client: BotClient): Promise<void> {
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    if (this.googleAPIToken) {
      /** 
       * Flag storing if the token was successfully refreshed. 
       * We don't need to go through the manual authentication process below if so.
       */
      let validToken = true;
      oAuth2Client.getToken(this.googleAPIToken, (err, token) => {
        if (err || !token) {
          validToken = false;
          return;
        }
        // Our stored token worked successfully! We can safely exit the function from here.
        oAuth2Client.setCredentials(token);
        this.googleAPIToken = token.access_token;
      });
      if (validToken) return;
    }
    /**
     * We don't have a refresh token stored in googleAPIToken, so we need to get a new one.
     * We'll have to manually confirm access to the API and input the returned token to the console.
     */
    const url = oAuth2Client.generateAuthUrl({ 
      access_type: 'offline', 
      scope: ['https://www.googleapis.com/auth/calendar.readonly'], 
    });
    console.log(`Authorize the Google Calendar API by visiting this url:\n\n${url}\n`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the refresh token from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err || !token) return console.error('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        // Save the token for future usage.
        this.googleAPIToken = token.access_token;
      });
    });
  }

  /**
   * Initialize the procedures involved to send Discord notifications for 
   * upcoming meetings on the ACM Google Calendar.
   * @param client The original client, for access to the configuration.
   */
  public initializeMeetingPings(client: BotClient): void {
    this.refreshAPIToken(client);
    /**
     * Read in clientId, clientSecret, redirectUri, and googleAPIToken in here from envvars
     */
    this.googleTokenRefreshJob = schedule.scheduleJob('*/30 * * * *', async () => {
      Logger.info('Running the refresh Google Calendar API token cronjob!');
      this.refreshAPIToken(client);
    });

    this.meetingNotificationsJob = schedule.scheduleJob('*/15 * * * *', async () => {
      Logger.info('Running meeting notifications cronjob!');
      // We'll update the calendar client and OAuth here to keep it up to date for the API call.
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oAuth2Client.setCredentials({ refresh_token: this.googleAPIToken });
      this.calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      this.runMeetingsPipeline(client);
    });
  }
}