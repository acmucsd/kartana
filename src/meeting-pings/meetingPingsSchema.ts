/**
 * The schema/mapping for meeting pings to function in GoogleCalendarManager.
 * Each entry of the array maps one Google Calendar (based on calendarId)
 * with a Discord channel to send notifications to and mentions to add in the 
 * description of the notification for upcoming meetings on the calendar.
 */
export const MeetingPingsSchema = [
  {
    name: 'Test Calendar',
    calendarID: '6surh50pqigb9m2rn7gakqpcgg@group.calendar.google.com',
    channelID: '964648119184814152',
    mentions: '974187756563623987',
  },
];