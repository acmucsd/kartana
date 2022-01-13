/**
 * A response to the Host Form, extracted from a row of its corresponding
 * Google Sheet.
 * 
 * This effectively matches the columns from the Google Spreadsheet.
 */
export interface HostFormResponse {
  'Event name': string;
  'Event director(s)': string;
  'What kind of event is this?': string;
  'Which of the following organizations are involved in this event?': string;
  'Preferred date': string;
  'Preferred start time': string;
  'Preferred end time': string;
  'Estimated Attendance?': string;
  'Additional Date/Time Notes': string;
  'Event description': string;
  'Which org goals does this event fulfill?': string;
  'Where is your event taking place?': string;
  'First choice for venue': string;
  'Second choice for venue': string;
  'Third choice for venue': string;
  'Other venue details?': string;
  'Will you need a projector?': string;
  'Will you want a recording of your in person event uploaded to the ACM YouTube channel? ': string;
  'If yes to the previous question: string; do you have any special recording requests?': string;
  'Event Link (ACMURL)': string;
  'Is there a sponsor that will pay for this event?': string;
  'Will you want a recording of your event uploaded to the ACM YouTube channel?': string;
  'List emails you would like to add as hosts (@ucsd.edu)': string;
  'List emails you would like to invite as panelists': string;
  'What acmurl will you be using for this event?': string;
  'Are there any other webinar-specific requests you would like to make?': string;
  'Will your event require funding?': string;
  'Are you planning on using the menu system for food?': string;
  'What do you need funding for?': string;
  'Non-menu system requests: Vendor website or menu': string;
  'Anything else you would like to let the Finance Team know about your event?': string;
  'Will your event require marketing?': string;
  'Any additional comments or requests?': string;
  'Timestamp': string;
  'Email Address': string;
  'BACKUP ONLINE VENUE: Would you like your backup online venue to be a standard Zoom room or Discord?': string;
  'What ACMURL do you want for the Facebook event page?': string;
}