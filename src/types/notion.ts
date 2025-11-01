import { GetUserResponse } from '@notionhq/client/build/src/api-endpoints';
import { notionCalSchema } from '../assets';
import { DateTime, Interval } from 'luxon';

function extractNames<T extends readonly { name: string }[]>(arr: T) {
  return arr.map(o => o.name) as {
    readonly [K in keyof T]: T[K] extends { name: infer N } ? N : never;
  };
}

export interface NotionCalEvent {
  readonly name: string;
  readonly description: string;
  readonly plainDescription: string;
  readonly offCampusGuests: OffCampusGuests;
  readonly type: EventType;
  readonly date: Interval;
  readonly dateTimeNotes: string;
  readonly projectedAttendance: number;
  readonly checkinCode: string;
  readonly organizations: StudentOrg[];
  readonly logisticsBy: LogisticsBy;
  readonly tokenEventGroup: TokenEventGroup;
  readonly tokenPass: TokenPass;
  readonly tokenUseNum: number;
  readonly location: EventLocation;
  readonly locationDetails: string;
  readonly projectorStatus: ProjectorStatus;
  readonly techRequests: string;
  readonly locationURL: URL | null;
  readonly fundingStatus: FundingStatus;
  readonly requestedItems: string;
  readonly foodPickupTime: DateTime | null;
  readonly nonFoodRequests: string;
  readonly fundingSponsor: FundingSponsor;
  readonly additionalFinanceInfo: string;
  readonly TAPStatus: TapStatus;
  readonly bookingStatus: BookingStatus;
}

const offCampusGuests = extractNames(notionCalSchema['Off Campus Guests'].select.options);
const eventTypes = extractNames(notionCalSchema.Type.select.options);
const studentOrgs = extractNames(notionCalSchema.Organizations.multi_select.options);
const logisticsBy = extractNames(notionCalSchema['Logistics By'].select.options);
const tokenEventGroups = extractNames(notionCalSchema['Token Event Group'].select.options);
const tokenPasses = extractNames(notionCalSchema['Token Pass'].select.options);
const eventLocations = extractNames(notionCalSchema.Location.select.options);
const projectorStatuses = extractNames(notionCalSchema['Projector?'].select.options);
const fundingStatuses = extractNames(notionCalSchema['Funding Status'].select.options);
const fundingSponsor = extractNames(notionCalSchema['Sponsor?'].select.options);
const tapStatuses = extractNames(notionCalSchema['TAP Status'].select.options);
const bookingStatuses = extractNames(notionCalSchema['Booking Status'].select.options);

// A Notion User.
export type NotionUser = GetUserResponse;

export type OffCampusGuests = typeof offCampusGuests[number];

export const isOffCampusGuests = (possibleOffCampusGuests: string): possibleOffCampusGuests is OffCampusGuests => {
  return offCampusGuests.includes(possibleOffCampusGuests as OffCampusGuests);
};

/**
 * The Type of NotionEvent held.
 */
export type EventType = typeof eventTypes[number];

/**
 * User-defined Type Guard for the EventType.
 *
 * @param type A random string.
 * @returns Whether the parameter complies with the EventType type.
 */
export const isEventType = (type: string): type is EventType => {
  return eventTypes.includes(type as EventType);
};

/**
 * Any student organizations ACM collaborates with or has Events hosted with.
 */
export type StudentOrg = typeof studentOrgs[number];

/**
 * User-defined Type Guard for StudentOrg.
 *
 * @param org A random string.
 * @returns Whether the parameter complies with the StudentOrg type.
 */
export const isStudentOrg = (org: string): org is StudentOrg => {
  return studentOrgs.includes(org as StudentOrg);
};

export type LogisticsBy = typeof logisticsBy[number];

export const isLogisticsBy = (by: string): by is LogisticsBy => {
  return logisticsBy.includes(by as LogisticsBy);
};

/**
 * Any student organizations ACM collaborates with or has Events hosted with.
 */
export type TokenEventGroup = typeof tokenEventGroups[number];

/**
 * User-defined Type Guard for StudentOrg.
 *
 * @param org A random string.
 * @returns Whether the parameter complies with the StudentOrg type.
 */
export const isTokenEventGroup = (group: string): group is TokenEventGroup => {
  return tokenEventGroups.includes(group as TokenEventGroup);
};

export type TokenPass = typeof tokenPasses[number];

export const isTokenPass = (pass: string): pass is TokenPass => {
  return tokenPasses.includes(pass as TokenPass);
};

// The location for a NotionEvent.
//
// This is limited to the values available in the Notion Calendar.
export type EventLocation = typeof eventLocations[number];

/**
 * Converter from the Host Form's locations to the Notion Calendar
 * entries for locations.
 *
 * Since they don't map 1:1, this effectively converts them properly.
 */
export const notionLocationTag = {
  'CSE 1202': 'CSE 1202',
  'CSE 4140': 'CSE 4140',
  'CSE B225': 'CSE B225 (Fishbowl)',
  'CSE Labs': 'Other (See Details)',
  'Design and Innovation Building Room 202/208': 'Design and Innovation Building 202/208',
  'Design and Innovation Building Room 306': 'Design and Innovation Building 306',
  'Design and Innovation Building Room 307': 'Design and Innovation Building 307',
  'Fung Auditorium (Paid)': 'Fung Auditorium',
  'Henry Booker Room': 'Henry Booker Room',
  'Jacobs Room 2315': 'Jacobs Room 2315',
  'Lecture Hall': 'Lecture Hall',
  'Library Walk': 'Library Walk',
  'PC Bear Room': 'PC Bear Room',
  'PC Eleanor Roosevelt Room': 'PC Eleanor Roosevelt Room',
  'PC Forum': 'PC Forum',
  'PC Green Room': 'PC Green Room',
  'PC Marshall Room': 'PC Marshall Room',
  'PC Muir Room': 'PC Muir Room',
  'PC Red Shoe Room': 'PC Red Shoe Room',
  'PC Revelle Room': 'PC Revelle Room',
  'PC Warren Room': 'PC Warren Room',
  'PC East Ballroom': 'PC East Ballroom',
  'PC West Ballroom': 'PC West Ballroom',
  'Sixth College Lodge': 'Sixth College Lodge',
  'Student Services Center Multi-Purpose Room (Paid)': 'Student Services Center Multi-Purpose Room',
  'SME ASML Room': 'SME ASML Room',
  'Warren Bear': 'Warren Bear',
  'Warren Mall': 'Warren Mall',
  'Off Campus': 'Off Campus',
  'Other': 'Other (See Details)',
};

export type ProjectorStatus = typeof projectorStatuses[number];

export const isProjectorStatus = (status: string): status is ProjectorStatus => {
  return projectorStatuses.includes(status as ProjectorStatus);
};

export type FundingStatus = typeof fundingStatuses[number];

export const isFundingStatus = (status: string): status is FundingStatus => {
  return fundingStatuses.includes(status as FundingStatus);
};

export type FundingSponsor = typeof fundingSponsor[number];

export const isFundingSponsor = (sponsor: string): sponsor is FundingSponsor => {
  return fundingSponsor.includes(sponsor as FundingSponsor);
};

export type TapStatus = typeof tapStatuses[number];

export const isTapStatuses = (status: string): status is TapStatus => {
  return tapStatuses.includes(status as TapStatus);
};

export type BookingStatus = typeof bookingStatuses[number];

export const isBookingStatus = (status: string): status is BookingStatus => {
  return bookingStatuses.includes(status as BookingStatus);
};