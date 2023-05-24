import { existsSync, readFileSync, writeFileSync } from 'fs';
import { calendar_v3 } from 'googleapis';

const GUEST_SCHEMA_FILE_PATH = 'meetingPingsGuestSchema.json';
const CALENDAR_SCHEMA_FILE_PATH = 'meetingPingsCalendarSchema.json';
/**
 * DiscordInfo is a representation of all the information a Google Calendar needs to be paired with.
 */
interface DiscordInfo {
  // The ID of the channel to send notifications to (typically an 18-digit number)
  channelID: string;
  // The ID of the person/role to mention in the notification (typically an 18-digit number)
  defaultMention: string;
}

interface CalendarInfo {
  name: string;
  calendarID: string;
  channelID: string;
  defaultMention: string;
}

interface GuestInfo {
  email: string;
  discordID: string;
}

export class MeetingPingsSchema {
  // Maps a Google Calendar ID to the ID of the Discord channel to send notifications to.
  private calendarMapping: Map<string, DiscordInfo>;

  // Maps a calendar guest's email to their Discord user ID so we can ping them.
  // Information is persistently stored in meetingPingsGuestSchema.json.
  private guestMapping: Map<string, string>;

  // A list of all Google Calendars and associated information with them.
  // Information is persistently stored in meetingPingsCalendarSchema.json.
  public calendarList: CalendarInfo[];

  /**
   * Gets the ID of the channel to send notifications to.
   * @param calendarID The Google Calendar ID of the calendar event.
   * @returns ID of the channel to send the notification of the event to.
   */
  public getChannelID(calendarID: string): string {
    if (!this.calendarMapping[calendarID]) {
      return '';
    }
    console.log(this.calendarMapping[calendarID].channelID);
    return this.calendarMapping[calendarID].channelID;
  }

  /**
   * Gets the Discord mention strings of the people/roles involved in this event.
   * @param calendarID The Google Calendar ID of the calendar event.
   * @param event The Google Calendar event to send mentions for.
   * @returns A string containing the mentions for all people in the event.
   */
  public getMentions(calendarID: string, event: calendar_v3.Schema$Event): string {
    const calendarDiscordInfo = this.calendarMapping[calendarID];
    /**
     * If there are attendees in this event, we'll return their
     * Discord IDs instead of pinging the Discord role if their email is
     * stored in our Calendar Guest mapping.
     */
    if (event.attendees && event.creator && event.creator.email) {
      const mentions = new Set<string>();
      event.attendees.forEach((attendee) => {
        if (attendee.email && this.guestMapping[attendee.email]) {
          mentions.add(`<@${this.guestMapping[attendee.email]}>`);
        }
      });
      /**
       * If none of their emails were in our mapping, we'll default to pinging the role.
       */
      if (mentions.size === 0) {
        return `<@&${calendarDiscordInfo.defaultMention}>`;
      }
      /**
       * We've now guaranteed that we're pinging guests about the event, so we'll add
       * the mention for the creator of the event at the start if we haven't already.
       */
      if (event.creator.email && this.guestMapping[event.creator.email]) {
        mentions.add(`<@${this.guestMapping[event.creator.email]}>`);
      }
      return Array.from(mentions.values()).join(' ');
    }
    // Note: The ampersand is specific to mentioning roles, not users.
    return `<@&${calendarDiscordInfo.defaultMention}>`;
  }

  /**
   * Initializes this.calendarList and this.calendarMapping based on the contents
   * of meetingPingsCalendarSchema.json.
   */
  private initializeCalendarMapping(): void {
    this.calendarMapping = new Map<string, DiscordInfo>();
    this.calendarList = [];
    try {
      if (existsSync(CALENDAR_SCHEMA_FILE_PATH)) {
        const content = readFileSync(CALENDAR_SCHEMA_FILE_PATH, { encoding: 'utf-8' });
        this.calendarList = JSON.parse(content) as CalendarInfo[];
        this.calendarList.forEach((calendarInfo) => {
          this.calendarMapping[calendarInfo.calendarID] = {
            channelID: calendarInfo.channelID,
            defaultMention: calendarInfo.defaultMention,
          };
        });
      } else {
        // Create the file as a blank file if it doesn't exist.
        writeFileSync(CALENDAR_SCHEMA_FILE_PATH, '[]');
      }
    } catch (err) {
      throw new Error(`Error while initializing calendar mapping: ${err.message}`);
    }
  }

  /**
   * Initializes this.guestMapping based on the contents of meetingPingsGuestSchema.json.
   */
  private initializeGuestMapping(): void {
    this.guestMapping = new Map<string, string>();
    try {
      if (existsSync(GUEST_SCHEMA_FILE_PATH)) {
        const content = readFileSync(GUEST_SCHEMA_FILE_PATH, { encoding: 'utf-8' });
        const guestInfoList = JSON.parse(content) as GuestInfo[];
        guestInfoList.forEach((guestInfo) => {
          this.guestMapping[guestInfo.email] = guestInfo.discordID;
        });
      } else {
        // Create the file as a blank file if it doesn't exist.
        writeFileSync(GUEST_SCHEMA_FILE_PATH, '[]');
      }
    } catch (err) {
      throw new Error(`Error while initializing calendar mapping: ${err.message}`);
    }
  }

  /**
   * @param email The email of the guest.
   * @returns Discord user ID associated with a guest's email, or null if it doesn't exist.
   */
  public getGuest(email: string): string | null {
    if (!this.guestMapping[email]) {
      return null;
    }
    return this.guestMapping[email];
  }

  /**
   * Adds a new guest/updates their Discord user ID in this.guestMapping.
   * Also saves the new information to meetingPingsGuestSchema.json.
   */
  public subscribeNewGuest(guestEmail: string, guestDiscordID: string): void {
    this.guestMapping[guestEmail] = guestDiscordID;
    const writeContents: GuestInfo[] = [];
    Object.keys(this.guestMapping).forEach((email) => {
      writeContents.push({ email, discordID: this.guestMapping[email] });
    });
    writeFileSync(GUEST_SCHEMA_FILE_PATH, JSON.stringify(writeContents, null, 2));
  }

  constructor() {
    this.initializeCalendarMapping();
    this.initializeGuestMapping();
  }
}
