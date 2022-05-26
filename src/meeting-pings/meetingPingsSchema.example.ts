/**
 * The schema/mapping for meeting pings to function in GoogleCalendarManager.
 * Each entry of the array maps one Google Calendar (based on calendarId)
 * with a Discord channel to send notifications to and mentions to add in the 
 * description of the notification for upcoming meetings on the calendar.
 * 
 * To add a new calendar to the Meeting Pings Schema:
 *   Step 1: Share the Google Calendar with the Google API Service Account linked to Kartana.
 *   Step 2: Copy the Calendar ID of the Google Calendar. 
 *   (Three dots next to the calendar name -> Settings and Sharing -> Integrate Calendar -> Calendar ID)
 *   Step 3: Copy the IDs of the Discord Channel and Role to be associated with the Calendar.
 *   Step 4: Add the name of the calendar, the calendarID from Step 2, and the channelID and role 
 *   mentions from Step 3 to the schema below.
 *   Step 5: Done! Kartana should check the new calendar and send pings for upcoming meetings.
 */
export const MeetingPingsSchema = [
  {
    name: 'Example Calendar',
    calendarID: 'abunchofnumbersandletters@group.calendar.google.com',
    channelID: '0123456789010111213',
    mentions: '0123456789010111213',
  },
];

/**
 * The schema/mapping for mentions to function in GoogleCalendarManager.
 * Each entry of the array maps one email to the person's Discord ID so that
 * when the email appears as a guest for a Google Calendar Event, Kartana will default
 * to pinging the people under the guest list instead of the Discord role associated with the calendar.
 */
export const CalendarGuestSchema = [
  {
    email: 'email@email.com',
    discordID: '0123456789010111213',
  },
];