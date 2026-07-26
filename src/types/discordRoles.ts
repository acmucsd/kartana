// Discord role names verbatim
// If role names are expected to change a lot, using role IDs is better

export enum DiscordRole {
  // role
  President = 'President',
  Executive = 'Executive',
  CommunityExec = 'Community Exec',
  Board = 'Board',
  Staff = 'Diamond Staff',
  MembersAtLarge = 'Members at Large',
  Member = 'Member',

  // community team
  AI = 'AI',
  Cyber = 'Cyber',
  Hack = 'Hack',
  GeneralBoard = 'General Board',

  // general team
  Development = 'Development',
  Events = 'Events',
  External = 'External',
  Finance = 'Finance',
  Hackathon = 'Hackathon',
  Membership = 'Membership',
  Outreach = 'Outreach',
  Projects = 'Projects',

  // other
  Design = 'Design',
  Matcha = 'Matcha',
}
export const ROLE_CHOICES = Object.values(DiscordRole);
