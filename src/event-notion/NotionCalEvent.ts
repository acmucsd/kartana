import { Client } from '@notionhq/client/build/src';
import { CreatePageParameters, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { DateTime, Interval } from 'luxon';
import {
  BookingStatus,
  EventLocation,
  EventType,
  FundingSponsor,
  FundingStatus,
  HostFormResponse,
  NotionCalEvent as INotionCalEvent,
  isEventType,
  isFundingSponsor,
  isLogisticsBy,
  isOffCampusGuests,
  isProjectorStatus,
  isStudentOrg,
  isTokenEventGroup,
  isTokenPass,
  LogisticsBy,
  notionLocationTag,
  ProjectorStatus,
  StudentOrg,
  TapStatus,
  TokenEventGroup,
  TokenPass,
} from '../types';
import Logger from '../utils/Logger';
import NotionEventPage from './NotionEventPage';

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
 * Checks whether a TAP form is required for the passed in host form response,
 *
 * This function is the business logic for checking for TAP form requirements
 * for any host form response. Initially, a TAP form is either in a TODO or
 * N/A state. We only check whether one is required at all.
 *
 * A TAP (Triton Activities Planner) form is required if the event is on campus.
 *
 * @param response The HostFormResponses for a given NotionCalEvent.
 * @returns The Notion Option for TAP form status.
 */
const needsTAPForm = (response: HostFormResponse): 'TAP N/A' | 'TAP TODO' => {
  return response['Where is your event taking place?'] === 'My event is on Zoom' ||
    response['Where is your event taking place?'] === 'My event is on Discord only' ||
    response['Where is your event taking place?'] === 'My event is off campus'
    ? 'TAP N/A'
    : 'TAP TODO';
};

/**
 * Checks whether a booking is required for the passed in host form response.
 *
 * This function is the business logic for checking for booking requirements
 * for any host form response.
 *
 * A booking is required for any on-campus event using a designated university area of
 * any kind. This includes events in conference rooms, Library Walk tiles, etc.
 *
 * @param response The HostFormResponse for a given NotionCalEvent.
 * @returns The Notion Option for Booking status.
 */
const needsBooking = (response: HostFormResponse): 'Booking N/A' | 'Booking TODO' => {
  return response['Where is your event taking place?'] === 'I need a venue on campus' ? 'Booking TODO' : 'Booking N/A';
};

/**
 * Takes the organizations involved in an event from the passed in host form response.
 *
 * Google Sheets stores Google Forms multiple-choice selections as comma-separated strings,
 * and since we assume the Host Form has a select number of StudentOrgs in it that are kept in
 * sync with our own type declarations, all we need to do is get our separated comma-delimited
 * values from the host form response and convert them to StudentOrg types.
 *
 * @param response The HostFormResponse for a given NotionCalEvent.
 * @returns The array of StudentOrgs involved with a NotionCalEvent.
 */
const filterOrgsResponse = (response: HostFormResponse): StudentOrg[] => {
  return response['Which of the following organizations are involved in this event?']
    .split(', ')
    .filter((studentOrg) => isStudentOrg(studentOrg));
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
const getEventInterval = (response: HostFormResponse): Interval => {
  let interval = Interval.fromDateTimes(
    // Convert from the provided host form responses to the DateTime objects.
    // The format string below SEEMS to work for most events, but I MAY be wrong.
    DateTime.fromFormat(`${response['Preferred date']} ${response['Preferred start time']}`, 'M/d/yyyy h:mm:ss a'),
    DateTime.fromFormat(`${response['Preferred date']} ${response['Preferred end time']}`, 'M/d/yyyy h:mm:ss a'),
  );

  if (!interval.isValid) {
    throw new TypeError("The date couldn't be parsed correctly. Make sure the start time is later than the end time!");
  }

  return interval;
};

/**
 * Get the food pickup time for an event.
 *
 * @param response The HostFormResponse for a given NotionCalEvent.
 * @returns The DateTime when food is planned to be picked up, or null if the field is blank on the form.
 */
const getFoodPickupTime = (response: HostFormResponse): DateTime | null => {
  if (response['Food Pickup Time']) {
    return DateTime.fromFormat(`${response['Preferred date']} ${response['Food Pickup Time']}`, 'M/d/yyyy h:mm:ss a');
  }
  return null;
};

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

  readonly name: string;

  readonly description: string;

  readonly plainDescription: string;

  readonly offCampusGuests: 'Yes' | 'No';

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

  constructor(parentCalendarID: string, hostedEventDatabaseID: string, formResponse: HostFormResponse) {
    this.parentCalendarID = parentCalendarID;
    this.hostedEventDatabaseID = hostedEventDatabaseID;
    this.response = formResponse;
    this.name = formResponse['Event name'];
    this.description = formResponse['Event description'];
    this.plainDescription = formResponse['Plain description'];
    this.offCampusGuests = isOffCampusGuests(formResponse['Are you planning on inviting off campus guests?'])
      ? formResponse['Are you planning on inviting off campus guests?']
      : 'No';
    this.type = isEventType(formResponse['What kind of event is this?'])
      ? formResponse['What kind of event is this?']
      : 'Other (See Comments)';
    this.date = getEventInterval(formResponse);
    this.dateTimeNotes = formResponse['Additional Date/Time Notes'];
    this.projectedAttendance = parseInt(formResponse['Estimated Attendance?']) || -1;
    this.checkinCode = formResponse['Check-in Code'];
    this.organizations = filterOrgsResponse(formResponse);
    this.logisticsBy = isLogisticsBy(formResponse['If this is a collab event, who will be handling the logistics?'])
      ? formResponse['If this is a collab event, who will be handling the logistics?']
      : 'ACM';
    this.tokenPass = isTokenPass(formResponse['Which pass will this event be submitted under?'])
      ? formResponse['Which pass will this event be submitted under?']
      : 'First Pass';
    if (!isTokenEventGroup(formResponse['Which team/community will be using their token?'])){
      throw new TypeError("The team you listed your token under doesn't seem to exist, make sure it is one \
        of the accepted orgs!");
    }
    this.tokenEventGroup = formResponse['Which team/community will be using their token?'];
    this.tokenUseNum = parseInt(formResponse['What token number will you be using?']) || -1;
    this.location = notionLocationTag[formResponse['Ideal Venue Choice']] || 'Other (See Details)';
    if (formResponse['Where is your event taking place?'] === 'My event is on Zoom') {
      this.location = 'Zoom (See Details)';
    }
    if (formResponse['Where is your event taking place?'] === 'My event is on Discord only') {
      this.location = 'Discord (See Details)';
    }
    if (formResponse['Where is your event taking place?'] === 'My event is off campus') {
      this.location = 'Off Campus';
    }
    this.locationDetails = formResponse['Other venue details?'];
    this.projectorStatus = isProjectorStatus(formResponse['Will you need a projector and/or other tech?'])
      ? formResponse['Will you need a projector and/or other tech?']
      : 'No';
    this.techRequests = formResponse['If you need tech or equipment, please specify here'];
    // Add a check to ensure no ill-written URL's are included.
    // Basically, try to fix classic shortenings of ACMURL's, and if there's still a URL parse error
    // Just warn the console and set the URL as null.
    //
    // TODO Ask host form to validate URL input fields as URL's.
    try {
      if (formResponse['Event Link (ACMURL)'].startsWith('acmurl.com')) {
        this.locationURL = new URL('https://' + formResponse['Event Link (ACMURL)']);
      } else {
        this.locationURL =
        formResponse['Event Link (ACMURL)'] !== '' ? new URL(formResponse['Event Link (ACMURL)']) : null;
      }
    } catch (e) {
      Logger.warn(`Event ${this.name} has erroneous location URL input! Setting as null.`, {
        input: formResponse['Event Link (ACMURL)'],
      });
      this.locationURL = null;
    }
    this.fundingStatus = formResponse['Will your event require funding?'] === 'Yes'
      ? 'Funding TODO'
      : 'Funding Not Requested';
    this.requestedItems = formResponse['What food do you need funding for?'];
    this.foodPickupTime = getFoodPickupTime(formResponse);
    this.nonFoodRequests = formResponse['Non-food system requests: Vendor website or menu'];
    this.fundingSponsor = isFundingSponsor(formResponse['Is there a sponsor that will pay for this event?'])
      ? formResponse['Is there a sponsor that will pay for this event?']
      : 'No';
    this.additionalFinanceInfo = formResponse['Any additional funding details?'];
    this.TAPStatus = needsTAPForm(formResponse);
    this.bookingStatus = needsBooking(formResponse);
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
        Name: {
          title: toNotionRichText(this.name),
        },
        Type: {
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
        Location: {
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
        Organizations: {
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
        ...(this.offCampusGuests
          ? {
            'Off Campus Guests': {
              rich_text: toNotionRichText(this.offCampusGuests),
            },
          }
          : {}),
        // "Booking Confirmation" omitted.
        //
        // We DEFINITELY don't add this, since we don't automate
        // booking requests.

        // "PR Manager" omitted.
        //
        // We don't know who will manage this event yet.
        Date: {
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
