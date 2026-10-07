/**
 * The schema of the Host Form response Google Sheet.
 *
 * This is just an ordered copy of the header values of the
 * Host Form Response Google Sheet as of Friday, 1 Oct 2026 04:32:00 PST,
 * sorted alphabetically (by code point, so uppercase sorts before lowercase).
 */
export const googleSheetSchema = [
  'Additional Date/Time Notes',
  'Any additional funding details?',
  'Are you planning on inviting off campus guests?',
  'Check-in Code',
  'Email Address',
  'Estimated Attendance?',
  'Event description',
  'Event director(s)',
  'Event Link (ACMURL)',
  'Event Title',
  'Food Pickup Time',
  'I understand that I will arrange someone to pickup the food or other items required for my event',
  'Ideal Venue Choice',
  'If this is a collab event, who will be handling the logistics?',
  'If you need tech or equipment, please specify here',
  'Is there a sponsor that will pay for this event?',
  'Non-food system requests: Vendor website or menu',
  'Other venue details?',
  'Plain description',
  'Please provide an itemized list of foods, tax, and the total. See example below such that it matches the image you will be providing in the previous question',
  'Preferred date',
  'Preferred end time',
  'Preferred start time',
  'Send the Itemized List Image',
  'Timestamp',
  'What food do you need funding for?', //LEGACY HEADER THAT STILL EXISTS FOR OLD FORM SUBMISSIONS, BUT NO LONGER VALIDATED AGAINST. REMOVE THIS WHEN THEY MAKE A NEW FORM NEXT YEAR
  'What kind of event is this?',
  'What token number will you be using?',
  'Where is your event taking place?',
  'Which of the following organizations are involved in this event?',
  'Which pass will this event be submitted under?',
  'Which team/community will be using their token?',
  'Will you need a projector and/or other tech?',
  'Will your event require ADDITIONAL marketing?',
  'Will your event require funding?',
] as const;
