import { Client } from '@notionhq/client/build/src';
import { CreatePageParameters, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { DateTime, Interval } from 'luxon';
import {
	BookingStatus,
	EventLocation,
	eventLocationType,
	EventType,
	eventTypes,
	fundingSponsor,
	FundingSponsor,
	FundingStatus,
	HostFormResponse,
	NotionCalEvent as INotionCalEvent,
	logisticsBy,
	LogisticsBy,
	notionLocationTag,
	offCampusGuests,
	OffCampusGuests,
	ProjectorStatus,
	projectorStatuses,
	StudentOrg,
	studentOrgs,
	TapStatus,
	TokenEventGroup,
	tokenEventGroups,
	TokenPass,
	tokenPasses,
} from '../types';
import Logger from '../utils/Logger';
import NotionEventPage from './NotionEventPage';
import { z } from 'zod';


/**
 * Convert a piece of Markdown-compliant text to a RichTextItemRequest for
 * the Notion API.
 *
 * For now, this function doesn't ACTUALLY do what the above text says.
 * We only directly convert text into a Rich Text block that Notion takes.
 *
 * Notion has a weird API, and this is a lot of boilerplate for just inserting text.
 * In the future, this function will also include Markdown parsing to provide formatting
 * support, like italics, bolds, etc.
 *
 * @param text The Markdown-compliant text to convert to Rich Text the Notion API takes.
 * @returns A Rich Text block for the Notion API to digest.
 */
export const toNotionRichText = (text: string) => {
	return [{ text: { content: text } }];
};


/**
 * Get the preferred times for an event to take place.
 *
 * This is a "simple" date parsing function (though admittedly the Google Sheets date format for
 * Google Sheets imports is NOT easy at all to parse).
 *
 * @param response The HostFormResponse for a given NotionCalEvent.
 * @returns The Interval in which a NotionCalEvent takes place.
 */
const getEventInterval = (date: string, startTime: string, endTime: string): Interval => {
	let interval = Interval.fromDateTimes(
		// Convert from the provided host form responses to the DateTime objects.
		// The format string below SEEMS to work for most events, but I MAY be wrong.
		DateTime.fromFormat(`${date} ${startTime}`, 'M/d/yyyy h:mm:ss a'),
		DateTime.fromFormat(`${date} ${endTime}`, 'M/d/yyyy h:mm:ss a'),
	);

	if (!interval.isValid) {
		throw new TypeError("The date couldn't be parsed correctly. Make sure the start time is later than the end time!");
	}

	return interval;
};

/**
 * Gets	and validates the full URL from a user inputted string. 
 * This function also accounts for cases when the prefix `https://` is omitted.
 *
 * @param urlString The URL string that the user inputs
 * @param eventName Name of the event, not relevant to URL but is just used for clearer error handling
 * @returns The URL object constructed from the user's input URL
 */
function parseLocationURL(urlString: string, eventName: string): URL | null {
	if (!urlString) return null;
	
	try {
		const fullUrl = urlString.startsWith('acmurl.com') 
			? `https://${urlString}` 
			: urlString;
		return new URL(fullUrl);
	} catch (e) {
		Logger.warn(`Event ${eventName} has erroneous location URL input! Setting as null.`, {
			input: urlString,
		});
		return null;
	}
}


/**
 * Zod schema validating input (HostFormResponse) and mapping to output (INotionCalEvent) 
 */
export const HostFormResponseSchema = z.object({
	// Section 1
	'Event name': z.string().min(1, 'Event name is required'),
	'Event description': z.string().min(1, 'Event description is required'),
	'Plain description': z.string().min(1, 'Plain description is required'),
	'Are you planning on inviting off campus guests?': z.enum(offCampusGuests, {errorMap: (event)=>({message: `Invalid off campus guest status: ${event}`})}),
	'What kind of event is this?': z.enum(eventTypes).catch('Other (See Comments)'), 
	'Preferred date': z.string(),
	'Preferred start time': z.string(),
	'Preferred end time': z.string(),
	'Additional Date/Time Notes': z.string().optional().default(''),
	'Estimated Attendance?': z.coerce.number().int('Attendance must be a whole number').positive('Attendance must be positive'),
	'Check-in Code': z.string().min(1, 'Check-in code is required, else put N/A'),
	'Which of the following organizations are involved in this event?': z.string().transform((val): StudentOrg[] => val.split(', ').filter(org => org in studentOrgs) as StudentOrg[]),
	'If this is a collab event, who will be handling the logistics?': z.enum(logisticsBy, {errorMap: (event)=>({message: `Invalid logistics handler: ${event}`})}), 
	'Which pass will this event be submitted under?': z.enum(tokenPasses, {errorMap: (event)=>({message: `Invalid pass: ${event}`})}), 
	'Which team/community will be using their token?': z.enum(tokenEventGroups, {errorMap: (event)=>({message: `Invalid token team/community: ${event}`})}), 
	'What token number will you be using?': z.coerce.number().int('Token number must be a whole number').nonnegative('Token number cannot be negative'),
	// Section 2
	'Where is your event taking place?': z.nativeEnum(eventLocationType, {errorMap: (event)=>({message: `Invalid event location: ${event}`})}),
	// Section 3 - Conditional based on venue
	'Ideal Venue Choice': z.string().optional().default(''),
	'Other venue details?': z.string().optional().default(''),
	'Will you need a projector and/or other tech?': z.enum(projectorStatuses).catch('No'),
	'If you need tech or equipment, please specify here': z.string().optional().default(''),
	// Section 4 - Conditional based on venue
	'Event Link (ACMURL)': z.string().optional().default(''),
	// Section 5
	'Will your event require funding?': z.string(),
	// Section 6
	'What food do you need funding for?': z.string().optional().default(''),
	'Food Pickup Time': z.string().optional(),
	'Non-food system requests: Vendor website or menu': z.string().optional().default(''),
	'Is there a sponsor that will pay for this event?': z.enum(fundingSponsor).catch("No"),
	'Any additional funding details?': z.string().optional().default(''),
}).superRefine((data, ctx) => {
	const venue = data['Where is your event taking place?'];
	
	// Venue is "I need a venue on campus": validate Section 3
	if (venue === eventLocationType.NEED_VENUE) {
		if (!data['Ideal Venue Choice']) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Ideal Venue Choice is required when you need a venue on campus',
				path: ['Ideal Venue Choice'],
			});
		}
		if (!data['Will you need a projector and/or other tech?']) { // not really necessary since this value already defaults to 'No' if empty anyways
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Tech requirements must be specified when you need a venue on campus',
				path: ['Will you need a projector and/or other tech?'],
			});
		}
	}
	
	// Venue is "My event is online": validate Section 4
	if (venue === eventLocationType.ONLINE) {
		if (!data['Event Link (ACMURL)']) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Event Link is required for online events',
				path: ['Event Link (ACMURL)'],
			});
		}
	}
}).transform((data) => ({
	name: data['Event name'],
	description: data['Event description'],
	plainDescription: data['Plain description'],
	offCampusGuests: data['Are you planning on inviting off campus guests?'],
	type: data['What kind of event is this?'],
	date: getEventInterval(data['Preferred date'], data['Preferred start time'], data['Preferred end time']),
	dateTimeNotes: data['Additional Date/Time Notes'],
	projectedAttendance: data['Estimated Attendance?'],
	checkinCode: data['Check-in Code'],
	organizations: data['Which of the following organizations are involved in this event?'],
	logisticsBy: data['If this is a collab event, who will be handling the logistics?'],
	tokenPass: data['Which pass will this event be submitted under?'],
	tokenEventGroup: data['Which team/community will be using their token?'],
	tokenUseNum: data['What token number will you be using?'],
	location: {
							'My event is on Zoom': 					'Zoom (See Details)', 
							'My event is on Discord only': 	'Discord (See Details)',
							'My event is off campus': 			'Off Campus'
						}[data['Where is your event taking place?']] // zoom/discord/off-campus
						?? notionLocationTag[data['Ideal Venue Choice']] // actual venue 
						?? 'Other (See Details)',
	locationDetails: data['Other venue details?'],
	projectorStatus: data['Will you need a projector and/or other tech?'],
	techRequests: data['If you need tech or equipment, please specify here'],
	locationURL: parseLocationURL(data['Event Link (ACMURL)'], data['Event name']),
	fundingStatus: data['Will your event require funding?'] === 'Yes' 
		? 'Funding TODO' 
		: 'Funding Not Requested',
	requestedItems: data['What food do you need funding for?'],
	foodPickupTime: data['Food Pickup Time'] 
		? DateTime.fromFormat(`${data['Preferred date']} ${data['Food Pickup Time']}`, 'M/d/yyyy h:mm:ss a')
		: null,
	nonFoodRequests: data['Non-food system requests: Vendor website or menu'].slice(0,2000), // Notion field text limit
	fundingSponsor: data['Is there a sponsor that will pay for this event?'],
	additionalFinanceInfo: data['Any additional funding details?'],
	TAPStatus: {
							'My event is on Zoom': 					'TAP N/A',
							'My event is on Discord only': 	'TAP N/A',
							'My event is off campus': 			'TAP N/A'
						}[data['Where is your event taking place?']] // No TAP needed for online/off-campus
						?? 'TAP TODO',
	bookingStatus: data['Where is your event taking place?'] === 'I need a venue on campus'
		? 'Booking TODO' 
		: 'Booking N/A',
}) as INotionCalEvent);


/**
 * NotionCalEvent is a representation of an event stored in the Notion Calendar.
 *
 * This Event can be of any type and does not have to correspond directly to a hosted event
 * from the Host Form necessarily.
 *
 * NotionCalEvent complies with the properties present in the Board Notion calendar, and thus
 * each field maps directly to the Notion Calendar database.
 *
 * The class is completely type-safe, meaning that ANY event that does not dispense a TypeError
 * upon construction can be safely used with the Notion API or any other without causing
 * inconsistencies in what Notion or other API's may store.
 */
export default class NotionCalEvent implements INotionCalEvent {
	// The original HostFormResponse object used to generate this NotionCalEvent.
	readonly response: HostFormResponse;

	// The calendar ID for the location where the Notion Event should exist in.
	readonly parentCalendarID: string;

	// The ID for the location where the related NotionEventPage should exist in.
	// We put this and its setter here since we directly create the NotionEventPage
	// right after uploading the calendar event page, since they are directly linked.
	readonly hostedEventDatabaseID: string;

	// Valid

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

	constructor(
		parentCalendarID: string, 
		hostedEventDatabaseID: string, 
		formResponse: HostFormResponse
	) {
		this.parentCalendarID = parentCalendarID;
		this.hostedEventDatabaseID = hostedEventDatabaseID;
		this.response = formResponse;

		try {
			const validated = HostFormResponseSchema.parse(formResponse);
			Object.assign(this, validated);
		} catch (error) {
			if (error instanceof z.ZodError) {
				let errorString = `Event creation failed for ${formResponse['Event name']} submitted by ${formResponse['Email Address']}: \n`
				error.issues.forEach(issue => {
					errorString += `	${issue.path.join('.')}: ${issue.message} \n`;
				});

				throw new Error(errorString);
			} else {
				let errorString = `Event creation failed for event ${formResponse['Event name']} submitted by ${formResponse['Email Address']}: \n`
				error += `Error: ${error.message}`

				throw new Error(errorString);
			}
		}

	}

	/**
	 * Uploads this event to Notion.
	 *
	 * This operation simply creates a page on the Notion calendar.
	 * It will not keep track of it once it is created. This uses the Notion API
	 * to submit.
	 *
	 * This is done by taking the properties of the event and converting
	 * them into the properties payload the Notion API requests for. See
	 * the API documentation for details of each property's type and contents.
	 *
	 * @see https://developers.notion.com/reference/post-page
	 * @see https://developers.notion.com/reference/page#all-property-values
	 * @returns the URL of the created Page for the event.
	 */
	public async uploadToNotion(client: Client): Promise<string> {
		const createPagePayload: CreatePageParameters = {
			parent: {
				database_id: this.parentCalendarID,
			},
			properties: {
				'Name': {
					title: toNotionRichText(this.name),
				},
				'Type': {
					select: { name: this.type },
				},
				'Funding Status': {
					select: { name: this.fundingStatus },
				},
				'TAP Status': {
					select: { name: this.TAPStatus },
				},
				'Logistics By': {
					select: { name: this.logisticsBy },
				},
				// "Funding Manager" omitted.
				//
				// We don't know how to set this yet.

				// "Marketing Description" omitted.
				//
				// The form does not exactly provide a specific way to deduce this.
				...(this.additionalFinanceInfo
					? {
						'Additional Finance Info': {
							rich_text: toNotionRichText(this.additionalFinanceInfo),
						},
					}
					: {}),
				'Location': {
					select: { name: this.location },
				},
				// Booking Time omitted.

				// "Event Coordinator" omitted.
				//
				// EC's will assign themselves an event to deal with, per
				// spec of pipeline.

				// "Check-in Code" omitted.
				//
				// This is set by EC's and Marketing, not us.
				'Booking Status': {
					select: { name: this.bookingStatus },
				},
				'Organizations': {
					multi_select: this.organizations.map((org) => {
						return { name: org };
					}),
				},
				'Projected Attendance': {
					number: this.projectedAttendance,
				},
				// Check whether the location URL is empty before adding it.
				//
				// This is required until the Host Form guarantees the Event Link field
				// is filled regardless of situation.
				// TODO Remove this along with null check for Event Link field.
				...(this.locationURL
					? {
						'Location URL': {
							url: this.locationURL.host + this.locationURL.pathname,
						},
					}
					: {}),

				// "YouTube Link" omitted.
				//
				// We don't get this from the host form.
				...(this.checkinCode
					? {
						'Check-in Code': {
							rich_text: toNotionRichText(this.checkinCode),
						},
					}
					: {}),

				// "AV Equipment" omitted.
				//
				// We don't automatically assign this.
				// "Drive Link" omitted.
				//
				// We don't know how to set this yet.
				...(this.techRequests
					? {
						'Tech Requests': {
							rich_text: toNotionRichText(this.techRequests),
						},
					}
					: {}),

				'Projector?': {
					select: { name: this.projectorStatus },
				},
				// "Other Graphics" omitted
				//
				// We don't know how to set this yet.

				// "Hosted by" omitted.
				//
				// This COULD be done if everyone had their names set on Notion,
				// but it'll be difficult to find them otherwise.

				...(this.locationDetails
					? {
						'Location Details': {
							rich_text: toNotionRichText(this.locationDetails),
						},
					}
					: {}),

				...(this.fundingSponsor
					? {
						'Sponsor?': {
							select: { name: this.fundingSponsor },
						},
					}
					: {}),

				...(this.foodPickupTime
					? {
						'Food Pickup Time': {
							date: {
								start: this.foodPickupTime.toISO(),
							},
						},
					}
					: {}),

				...(this.description
					? {
						'Event Description': {
							rich_text: toNotionRichText(this.description),
						},
					}
					: {}),
				...(this.plainDescription
					? {
						'Plain Description': {
							rich_text: toNotionRichText(this.plainDescription),
						},
					}
					: {}),
				'Off Campus Guests': {
					select: { name: this.offCampusGuests },
				},
				// "Booking Confirmation" omitted.
				//
				// We DEFINITELY don't add this, since we don't automate
				// booking requests.

				// "PR Manager" omitted.
				//
				// We don't know who will manage this event yet.
				'Date': {
					date: {
						start: this.date.start.toISO(),
						end: this.date.end.toISO(),
					},
				},

				...(this.requestedItems
					? {
						'Requested Items': {
							rich_text: toNotionRichText(this.requestedItems),
						},
					}
					: {}),

				...(this.nonFoodRequests
					? {
						'Non-food Requests': {
							rich_text: toNotionRichText(this.nonFoodRequests),
						},
					}
					: {}),


				...(this.dateTimeNotes
					? {
						'Date/Time Notes': {
							rich_text: toNotionRichText(this.dateTimeNotes),
						},
					}
					: {}),
				// "Historian Onsite" omitted.
				//
				// We don't know this yet.
				'Token Pass': {
					select: { name: this.tokenPass },
				},
				'Token Event Group': {
					select: { name: this.tokenEventGroup },
				},
				...(this.tokenUseNum
					? {
						'Token Use Number': {
							number: this.tokenUseNum,
						},
					}
					: {}),

			},
		};

		// Upload the event to Notion's API. If this errors, out, we'll need to
		// send a message to Discord paging me about the issue.
		//
		// For now, just throw the error.
		const response = (await client.pages.create(createPagePayload)) as PageObjectResponse;

		// Next, we create and link the related Notion Hosted Event Page.
		const linkedEventPage = new NotionEventPage(this.name, this.date.start);
		linkedEventPage.setCalendarEventID(response.id);
		linkedEventPage.setDatabaseID(this.hostedEventDatabaseID);
		await linkedEventPage.uploadToNotion(client);

		// Once this is all complete, we return the created Calendar Event URL.
		Logger.debug(`Page ${response.id} created for event "${this.name}"`);
		return response.url;
	}
}
