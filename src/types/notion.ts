import { GetUserResponse } from '@notionhq/client/build/src/api-endpoints';

export type NotionUser = GetUserResponse;

export type EventLocation = 'Zoom (See Details)'
| 'Discord (See Details)'
| 'Qualcomm Room'
| 'Henry Booker Room'
| 'Fung Auditorium'
| 'CSE 1202'
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
| 'Other (See Details)';

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
| 'Info Session';

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
    || type === 'Info Session';
};

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
| 'Girls Who Code';

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
  || org === 'Quantum Computing at UCSD';
};