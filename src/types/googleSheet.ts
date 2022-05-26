/**
 * A response to the Host Form, extracted from a row of its corresponding
 * Google Sheet.
 * 
 * This effectively matches the columns from the Google Spreadsheet.
 */
export interface HostFormResponse {
  'Event name': string,
  'Event director(s)': string,
  'What kind of event is this?': string,
  'Which of the following organizations are involved in this event?': string,
  'Preferred date': string,
  'Preferred start time': string,
  'Preferred end time': string,
  'Additional Date/Time Notes': string,
  'Estimated Attendance?': string,
  'Event description': string,
  'Where is your event taking place?': string,
  'First choice for venue': string,
  'Second choice for venue': string,
  'Third choice for venue': string,
  'Other venue details?': string,
  'Will you need a projector?',
  'BACKUP ONLINE VENUE: Would you like your backup online venue to be a standard Zoom room or Discord?': string,
  'Event Link (ACMURL)': string,
  'Will you want a recording of your in person event uploaded to the ACM YouTube channel?': string,
  'If yes to the previous question, do you have any special recording requests?': string,
  'Will your event require funding?': string,
  'What food do you need funding for?': string,
  'Non-food system requests: Vendor website or menu': string,
  'Is there a sponsor that will pay for this event?': string,
  'Any additional funding details?': string,
  'Will your event require marketing?': string,
  'What FB ACMURL do you want for the Facebook event page?': string,
  'Any additional comments or requests?': string,
  'Timestamp': string,
  'Email Address': string,
  'If you need tech or equipment, please specify here': string,
  'Food Pickup Time': string,
  'I understand that I will arrange someone to pickup the food or other items required for my event': string,
}