/**
 * The schema of the Host Form response Google Sheet.
 *
 * This is just an ordered copy of the header values of the
 * Host Form Response Google Sheet as of Friday, 24 Oct 2025 07:38:00 PST.
 */
export const googleSheetSchema = [
  'Timestamp',
  'Email Address',
  'Event name',
  'Event description',
	'Plain description',
  'Event director(s)',
  'What kind of event is this?',
  'Preferred date',
  'Preferred start time',
  'Preferred end time',
  'Additional Date/Time Notes',
  'Estimated Attendance?',
  'Check-in Code',
  'Which of the following organizations are involved in this event?',
  'If this is a collab event, who will be handling the logistics?',
  'Which pass will this event be submitted under?',
  'Which team/community will be using their token?',
  'What token number will you be using?',
  'Where is your event taking place?',
  'Ideal Venue Choice',
  'Other venue details?',
  'Will you need a projector and/or other tech?',
  'If you need tech or equipment, please specify here',
  'Event Link (ACMURL)',
  'Will your event require funding?',
  'What food do you need funding for?',
  'Food Pickup Time',
  'I understand that I will arrange someone to pickup the food or other items required for my event',
  'Non-food system requests: Vendor website or menu',
  'Is there a sponsor that will pay for this event?',
  'Any additional funding details?',
  'Will your event require ADDITIONAL marketing?',
  'Are you planning on inviting off campus guests?',
] as const;
