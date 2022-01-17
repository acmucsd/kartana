import { GetUserResponse } from '@notionhq/client/build/src/api-endpoints';

// A Notion User.
export type NotionUser = GetUserResponse;

// The location for a NotionEvent.
//
// This is limited to the values available in the Notion Calendar.
export type EventLocation = 'Zoom (See Details)'
| 'Discord (See Details)'
| 'Qualcomm Room'
| 'Henry Booker Room'
| 'Fung Auditorium'
| 'CSE 1202'
| 'Room 2315'
| 'PC Eleanor Roosevelt Room'
| 'PC Marshall Room'
| 'PC Muir College Room'
| 'PC Warren Room'
| 'PC Revelle Room'
| 'PC Red Shoe Room'
| 'PC Snake Path Room'
| 'PC East Ballroom'
| 'PC West Ballroom'
| 'Multi-Purpose Room'
| 'Warren Mall'
| 'Warren Bear'
| 'Warren College SAC'
| 'Sixth College Lodge'
| 'Library Walk'
| 'Lecture Hall (See Details)'
| 'Off Campus'
| 'Other (See Details)'
| 'CSE B225'
| 'PC Forum'
| 'PC Bear Room';

/**
 * Converter from the Host Form's locations to the Notion Calendar
 * entries for locations.
 * 
 * Since they don't map 1:1, this effectively converts them properly.
 */
export const notionLocationTag = {
  'Price Center West Ballroom': 'PC West Ballroom',
  'Price Center East Ballroom': 'PC East Ballroom',
  'Price Center Roosevelt College Room': 'PC Eleanor Roosevelt Room',
  'Price Center Marshall College Room': 'PC Marshall Room',
  'Price Center Warren College Room': 'PC Warren Room',
  'Price Center Revelle College Room': 'PC Revelle Room',
  'Price Center Muir College Room': 'PC Muir College Room',
  'Price Center Red Shoe Room': 'PC Red Shoe Room',
  'Student Services Center Multi Purpose Room': 'Multi-Purpose Room',
  'EBU-1 Qualcomm Room': 'Qualcomm Room',
  'EBU-1 Henry Booker Room': 'Henry Booker Room',
  'CSE 1202': 'CSE 1202',
  'CSE Labs': 'Other (See Details)',
  'Fung Auditorium': 'Fung Auditorium',
  'Warren College SAC': 'Warren College SAC',
  'Warren Mall': 'Warren Mall',
  'Sixth College Lodge': 'Sixth College Lodge',
  'Lecture Hall': 'Lecture Hall (See Details)',
  'Other': 'Other (See Details)',
};

// The lines here are long, gross, and impossible to reduce down to length right now.
// Just disable ESLint's rule for max line length on these.
/* eslint-disable max-len */

/**
 * Converter from the Host Form's answers for the "Upload to YouTube?"
 * question to the Notion calendar's entries for the eponymous column.
 */
export const notionYoutubeAnswer = {
  'No, I do not want anything uploaded to YouTube': 'No I do not want anything uploaded to YouTube',
  'Yes, I will post a link to the recording on the Notion calendar after the event so that the Events team can upload it for me': 'Yes but I will record it myself and send the Events team a link',
  'Yes, I would like the Events team to handle the all aspects of recording for my event (in person events only)': 'Yes I would like the Events team to handle the all aspects of recording for my event',
  'Yes, and I will upload it to the ACM YouTube channel myself': 'Yes and I will upload it to the ACM YouTube channel myself',
  'Yes, but I will record it myself and send the Events team a link': 'Yes but I will record it myself and send the Events team a link',
  '': 'No I do not want anything uploaded to YouTube',
};
/* eslint-enable max-len */

/**
 * The Type of NotionEvent held.
 */
export type EventType = 'Competition'
| 'Workshop'
| 'Industry Panel'
| 'Social'
| 'Seminar'
| 'GBM'
| 'Meeting'
| 'Non-Event'
| 'Unconfirmed Details'
| 'CANCELLED'
| 'Other (See Comments)'
| 'Talk'
| 'Side Projects Showcase'
| 'Projects Kickoff'
| 'Kickoff'
| 'Mid Quarter Meeting'
| 'Info Session'
| 'PENDING EVENT HOST WORKSHOP';

/**
 * User-defined Type Guard for the EventType.
 * 
 * @param type A random string.
 * @returns Whether the parameter complies with the EventType type.
 */
export const isEventType = (type: string): type is EventType => {
  return type === 'Competition'
    || type === 'Industry Panel'
    || type === 'Social'
    || type === 'Seminar'
    || type === 'GBM'
    || type === 'Meeting'
    || type === 'Non-Event'
    || type === 'Unconfirmed Details'
    || type === 'CANCELLED'
    || type === 'Other (See Comments)'
    || type === 'Talk'
    || type === 'Side Projects Showcase'
    || type === 'Projects Kickoff'
    || type === 'Kickoff'
    || type === 'Info Session'
    || type === 'PENDING EVENT HOST WORKSHOP'
    || type === 'Mid Quarter Meeting';
};

/**
 * Any student organizations ACM collaborates with or has Events hosted with.
 */
export type StudentOrg = 'ACM General'
| 'ACM AI'
| 'ACM Cyber'
| 'ACM Design'
| 'ACM Hack'
| 'ACM Innovate'
| 'TSE'
| 'TESC'
| 'IEEE'
| 'WIC'
| 'HKN'
| 'DS3'
| 'EDGE'
| 'PIB'
| 'ECE UCSD'
| 'ECE USC'
| 'Tau Beta Pi'
| 'QC'
| 'SASE'
| 'Contrary Capital'
| 'Phi Beta Lambda'
| 'Quantum Computing at UCSD'
| 'Girls Who Code'
| 'The Zone';

/**
 * User-defined Type Guard for StudentOrg.
 *
 * @param org A random string.
 * @returns Whether the parameter complies with the StudentOrg type.
 */
export const isStudentOrg = (org: string): org is StudentOrg => {
  return org === 'ACM General'
  || org === 'ACM AI'
  || org === 'ACM Cyber'
  || org === 'ACM Design'
  || org === 'ACM Hack'
  || org === 'ACM Innovate'
  || org === 'TSE'
  || org === 'TESC'
  || org === 'IEEE'
  || org === 'WIC'
  || org === 'HKN'
  || org === 'DS3'
  || org === 'EDGE'
  || org === 'PIB'
  || org === 'ECE UCSD'
  || org === 'ECE USC'
  || org === 'Tau Beta Pi'
  || org === 'QC'
  || org === 'SASE'
  || org === 'Contrary Capital'
  || org === 'Phi Beta Lambda'
  || org === 'Quantum Computing at UCSD'
  || org === 'Girls Who Code'
  || org === 'The Zone';
};