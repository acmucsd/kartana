export enum ACMTeam {
  AI = 'AI',
  Cyber = 'Cyber',
  Development = 'Development',
  Events = 'Events',
  External = 'External',
  Finance = 'Finance',
  Hack = 'Hack',
  Hackathon = 'Hackathon',
  Membership = 'Membership',
  Outreach = 'Outreach',
  Projects = 'Projects',
  None = 'None', // presidents, mal, and non-board members
}
export const TEAM_CHOICES = Object.values(ACMTeam);

export enum ACMCommunity {
  AI = 'AI',
  Cyber = 'Cyber',
  Hack = 'Hack',
  General = 'General',
}

export enum ACMPosition {
  President = 'President',
  VP = 'VP',
  Board = 'Board',
  Staff = 'Staff',
  Applicant = 'Applicant',
  MAL = 'Member at Large',
  Member = 'Member',
}
export const POSITION_CHOICES = Object.values(ACMPosition);
