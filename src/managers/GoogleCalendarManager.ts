import { Service } from 'typedi';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { DateTime, Interval } from 'luxon';
import { calendar_v3, google } from 'googleapis';
import { ColorResolvable, MessageEmbed, TextChannel } from 'discord.js';
import { MeetingPingsSchema, DiscordInfo } from '../meeting-pings';

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
   * Mapping of discord id's to scheduled messages
   */
  public messageMapping: Map<string, string[]>;

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
    // Reading in calendar colors from the Google API to color our embeds
    const colors = await this.calendar.colors.get({});
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
        // Getting the specific color ID of our current calendar to color our embeds later.
        const calColorResponse = await this.calendar.calendarList.get({ calendarId: calendarID });
        const calColorID = calColorResponse.data.colorId;
        events.map(async (event, i) => {
          // Note: All events in this list returned by the API are guaranteed to have these fields.
          // I've included this statement so TypeScript won't complain about them potentially being undefined.
          if (event && event.start && event.end && event.start.dateTime && event.end.dateTime) {
            // Send a specific embed for each meeting to the specified channel.
            const startTime = DateTime.fromISO(event.start.dateTime);
            const endTime = DateTime.fromISO(event.end.dateTime);
            const searchInterval = Interval.fromDateTimes(start, end);
            // We only send embeds for events that are just starting in our time window.
            if (searchInterval.contains(startTime)) {
              const mentions = this.calendarMapping[calendarID].getMentions(event);
              let messageEmbed = new MessageEmbed()
                .setTitle('🗓️ ' + (event.summary || 'Untitled Event'))
                .setDescription(event.description || '')
                .addField('⏰ Time', 
                  `<t:${Math.trunc(startTime.toSeconds())}:F> to <t:${Math.trunc(endTime.toSeconds())}:F>`)
                .addField('👥 People', mentions)
                .setColor('WHITE');
              // Add the location of the event to the embed if it exists.
              if (event.location) {
                messageEmbed = messageEmbed.addField('📍 Location', event.location);
              }
              // Update the coloring for our embed.
              if (event.colorId && colors.data.event) {
                // Checking if the event has a special color first...
                messageEmbed = messageEmbed.setColor(colors.data.event[event.colorId].background as ColorResolvable);
              } else {
                // Otherwise, we default to the color given by our calendar.
                if (calColorID && colors.data.calendar) {
                  messageEmbed = messageEmbed.setColor(colors.data.calendar[calColorID].background as ColorResolvable);
                }
              }
              const channel = client.channels.cache.get(this.calendarMapping[calendarID].getChannelID()) as TextChannel;
              channel.send({
                content: `Meeting starting <t:${Math.trunc(startTime.toSeconds())}:R>! ${mentions}`,
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
        content: `*Paging <@&${client.settings.maintainerID}>!*`,
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
      try {
        await this.calendar.calendarList.insert({ requestBody: { id: entry.calendarID } });
        this.calendarList.push(entry.calendarID);
        this.calendarMapping[entry.calendarID] = new DiscordInfo(entry.channelID, entry.mentions);
        Logger.info(`Successfully imported calendar ${entry.name}`);
      } catch (err) {
        // We'll report if there's an API error to deal with the issue.
        Logger.error(`Error importing calendar ${entry.name}: ${err}`);
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error with Google Calendar API!')
          .setDescription(`Error importing calendar ${entry.name}: ${err}`)
          .setColor('DARK_RED');
        const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
        channel.send({
          content: `*Paging <@&${client.settings.maintainerID}>!*`,
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

  /**
   * This method adds a new scheduled message event to the google calendar
   * 
   * Note events will be created using the following format
   * Summary (title) : channel ID
   * Description: Will contain the message
   * Start time: Will be time for message to be sent 
   * End Time: Will be 5 seconds after message send time (note this is required by Google API)
   * @param client The original client, for access to the configuration
   * @param channelID The id of the channel for the message to be sent to
   * @param message The message to be sent
   * @param date The datetime object which specifies when the message should be sent
   */
  public async addScheduledMessage(client: BotClient, channelID: string, message: string, date: DateTime): 
  Promise<void> {
    //Get the auth token
    await this.refreshAuth(client);
    //Try adding a event to the calendar
    //Note event has end time 5 seconds after start time
    try {
      this.calendar.events.insert({
        'calendarId': client.settings.scheduledMessageGoogleCalendarID,
        'requestBody': {
          'summary' : channelID,
          'description' : message,
          start : {
            'dateTime' : date.toString(),
          },
          end : {
            'dateTime' : date.plus({ seconds: 5 }).toString(),
          },
        },
      });
    } catch (err) {
      // We'll report if there's an API error to deal with the issue.
      Logger.error(`Error importing scheduled message calendar}: ${err}`);
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error with Google Calendar API!')
        .setDescription(`Error importing scheduled message calendar: ${err}`)
        .setColor('DARK_RED');
      const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
      channel.send({
        content: `*Paging <@&${client.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
    } 
  }

  /**
   * This method schedules a message to be sent using a cronjob
   * @param client: The bot client
   * @param dateTime: Datetime object representing when message is to be sent
   * @param message: The actual message being sent
   * @param channelID: The channel id as a string for where the message should be sent
   */
  public scheduleMessage(client: BotClient, dateTime: DateTime, message: string, channelID: string) {
    schedule.scheduleJob(dateTime.toJSDate(), async () => {
      Logger.info(`Scheduled a message to be sent at ${dateTime.toLocaleString(DateTime.DATETIME_SHORT)}`);
      
      //Get the channel as a Text Channel
      const channelToSend = client.channels.cache.get(channelID) as TextChannel;
      
      /**
       * Alert someone if the channel went missing between now and when the message is sent
      */
      if (channelToSend === null) {
        Logger.error('Channel for scheduled message no longer exists.');
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error with ScheduleSend!')
          .setDescription('Error sending scheduled message: Channel no longer exists!')
          .setColor('DARK_RED');
        const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
        channel.send({
          content: `*Paging <@&${client.settings.maintainerID}>!*`,
          embeds: [errorEmbed],
        });
        return;
      }
      
      // Sends the message to the channel
      await channelToSend.send(message); 
    });
  }


  /**
   * This command will initialize the scheduled messages command by pulling all events 
   * from time of bot initialization till 1000 hours from now and schedule any events
   * @param client: Bot client
   */
  public async initializeScheduledMessages(client: BotClient): Promise<void> {
    //Refresh the auth
    await this.refreshAuth(client);
    
    //We want to check for events from now to 1000 hours from now
    const now = DateTime.now().minus({ minutes: 1 }).set({ second: 59 });
    const end = now.plus({ hours: 1000 });

    //Get all the calendar events
    const res = await this.calendar.events.list({
      calendarId: client.settings.scheduledMessageGoogleCalendarID,
      timeMin: now.toISO(),
      timeMax: end.toISO(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    //If any events exist
    if (res && res.data.items){
      const events = res.data.items;
      for (const event of events){
        //Check to make sure event was created with proper format
        if (event.start && event.start.dateTime && event.description && event.summary){
          //Get all necessary params
          const startTime = DateTime.fromISO(event.start.dateTime);
          const message = event.description;
          const channelID = event.summary;
          //Schedule the message
          this.scheduleMessage(client, startTime, message, channelID);
        }
      }

    }

  }

  /**
   * This method will map a discord id to a calendar event to be used to pull all 
   * scheduled messages that a user has.
   */
  public async addToMessageMapping(member: string, eventId: string): Promise<boolean> {
    const memberList = this.messageMapping.get(member);
    if (memberList && memberList.includes(eventId)) {
      return false;
    } 
    
    return true;
  }
  
}