export * from './meetingPingsSchema';
import { calendar_v3 } from 'googleapis';
import { CalendarGuestSchema } from './meetingPingsSchema';

const calendarGuestMap = new Map<string, string>();
for (const row of CalendarGuestSchema) {
  calendarGuestMap[row.email] = row.discordID;
}

/**
 * DiscordInfo is a representation of the Discord channel info that each Google Calendar maps to.
 */
export class DiscordInfo {
  // The ID of the channel to send notifications to (typically an 18-digit number) 
  private channelID: string;

  // The ID of the person/role to mention in the notification (typically an 18-digit number)
  private mentions: string;

  /**
   * Gets the ID of the channel to send notifications to.
   * @returns ID of the channel.
   */
  public getChannelID(): string {
    return this.channelID;
  }

  /**
   * Gets the Discord mention strings of the people/roles involved in this event.
   * @param event The Google Calendar event to send mentions for.
   * @returns A string containing the mentions for all people in the event.
   */
  public getMentions(event: calendar_v3.Schema$Event): string {
    /**
     * If there are attendees in this event, we'll return their
     * Discord IDs instead of pinging the Discord role if their email is 
     * stored in our Calendar Guest mapping.
     */
    if (event.attendees && event.creator && event.creator.email) {
      let mentions = '';
      for (const attendee of event.attendees) {
        if (attendee.email && calendarGuestMap[attendee.email]) {
          mentions += `<@${calendarGuestMap[attendee.email]}>`;
        }
      }
      /**
       * If none of their emails were in our mapping, we'll default to pinging the role.
       */
      if (mentions === '') {
        return `<@&${this.mentions}>`;
      }
      /**
       * We've now guaranteed that we're pinging guests about the event,
       * so we'll add the mention for the creator of the event at the start.
       */
      if (calendarGuestMap[event.creator.email]) {
        mentions = `<@${calendarGuestMap[event.creator.email]}>` + mentions;
      }
      return mentions;
    }
    // Note: The ampersand is specific to mentioning roles, not users.
    return `<@&${this.mentions}>`;
  }

  constructor(channelID: string, mentions: string) {
    this.channelID = channelID;
    this.mentions = mentions;
  }
}