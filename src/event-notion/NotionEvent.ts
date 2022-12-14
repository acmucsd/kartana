import { Client } from '@notionhq/client/build/src';
import { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints';
import { DateTime, Interval } from 'luxon';
import {
  notionLocationTag,
  EventLocation,
  EventType,
  HostFormResponse,
  isEventType,
  NotionUser,
  StudentOrg,
  isStudentOrg,
  notionYoutubeAnswer,
} from '../types';
import Logger from '../utils/Logger';

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
  return [ { text: { content: text } } ];
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
 * @param response The HostFormResponses for a given NotionEvent.
 * @returns The Notion Option for TAP form status.
 */
const needsTAPForm = (response: HostFormResponse): 'TAP N/A' | 'TAP TODO' => {
  return (response['Where is your event taking place?'] === 'My event is on Zoom'
  || response['Where is your event taking place?'] === 'My event is on Discord only'
  || response['Where is your event taking place?'] === 'My event is off campus')
    ? 'TAP N/A'
    : 'TAP TODO';
};

/**
 * Checks whether a CSI Intake Form is required for the passed in host form response,
 *
 * This function is the business logic for checking for CSI intake form requirements
 * for any host form response.
 * 
 * The CSI Intake Form is required for ALL in-person on-campus events since the pandemic.
 *
 * @param response The HostFormResponse for a given NotionEvent.
 * @returns The Notion Option for CSI Intake Form status.
 */
const needsIntakeForm = (response: HostFormResponse): 'Intake Form N/A' | 'Intake Form TODO' => {
  return 'Intake Form N/A';
  /** We currently don't need intake forms, so this is commented out.
  return (response['Where is your event taking place?'] === 'My event is on Zoom'
  || response['Where is your event taking place?'] === 'My event is on Discord only'
  || response['Where is your event taking place?'] === 'My event is off campus')
    ? 'Intake Form N/A'
    : 'Intake Form TODO';
  */
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
 * @param response The HostFormResponse for a given NotionEvent.
 * @returns The Notion Option for Booking status.
 */
const needsBooking = (response: HostFormResponse): 'Booking N/A' | 'Booking TODO' => {
  return (response['Where is your event taking place?'] === 'I need a venue on campus') 
    ? 'Booking TODO'
    : 'Booking N/A';
};

/**
 * Checks whether a recording is required for the passed in host form response.
 * 
 * This function is the business logic for checking for recordings requirements
 * for any host form response.
 * 
 * A recording is required ONLY if requested by the person filling the Host Form.
 * 
 * TODO We MIGHT wanna convert `'Yes' | 'No'` to a standard `boolean`; in some ways
 * this complicates certain business logic checking parts of the code and makes using
 * the NotionEvent code unintuitive.
 * 
 * @param response The HostFormResponse for a given NotionEvent.
 * @returns The Notion Option for Recording requirement.
 */
const needsRecording = (response: HostFormResponse): 'Yes' | 'No' => {
  return (response['Will you want a recording of your event uploaded to the ACM YouTube channel?'] 
          === 'Yes, I will record it myself and send the Events team a link')
    ? 'Yes'
    : 'No';
};

/**
 * Takes the organizations involved in an event from the passed in host form response.
 * 
 * Google Sheets stores Google Forms multiple-choice selections as comma-separated strings,
 * and since we assume the Host Form has a select number of StudentOrgs in it that are kept in
 * sync with our own type declarations, all we need to do is get our separated comma-delimited
 * values from the host form response and convert them to StudentOrg types.
 * 
 * @param response The HostFormResponse for a given NotionEvent. 
 * @returns The array of StudentOrgs involved with a NotionEvent.
 */
const filterOrgsResponse = (response: HostFormResponse): StudentOrg[] => {
  return response['Which of the following organizations are involved in this event?']
    .split(', ')
    .filter((studentOrg) => isStudentOrg(studentOrg)) as StudentOrg[];
};

/**
 * Get the preferred times for an event to take place.
 * 
 * This is a "simple" date parsing function (though admittedly the Google Sheets date format for
 * Google Sheets imports is NOT easy at all to parse).
 * 
 * @param response The HostFormResponse for a given NotionEvent.
 * @returns The Interval in which a NotionEvent takes place.
 */
const getEventInterval = (response: HostFormResponse): Interval => {
  return Interval.fromDateTimes(
    // Convert from the provided host form responses to the DateTime objects.
    // The format string below SEEMS to work for most events, but I MAY be wrong.
    DateTime.fromFormat(`${response['Preferred date']} ${response['Preferred start time']}`, 'M/d/yyyy h:mm:ss a'),
    DateTime.fromFormat(`${response['Preferred date']} ${response['Preferred end time']}`, 'M/d/yyyy h:mm:ss a'),
  );
};

/**
 * Get the food pickup time for an event.
 * 
 * @param response The HostFormResponse for a given NotionEvent.
 * @returns The DateTime when food is planned to be picked up, or null if the field is blank on the form.
 */
const getFoodPickupTime = (response: HostFormResponse): DateTime | null => {
  if (response['Food Pickup Time']) {
    return DateTime.fromFormat(`${response['Preferred date']} ${response['Food Pickup Time']}`, 'M/d/yyyy h:mm:ss a');
  }
  return null;
};

/**
 * NotionEvent is a representation of an event stored in the Notion Calendar.
 * 
 * This Event can be of any type and does not have to correspond directly to a hosted event
 * from the Host Form necessarily.
 * 
 * NotionEvent complies with the properties present in the Board Notion calendar, and thus
 * each field maps directly to the Notion Calendar database.
 * 
 * The class is completely type-safe, meaning that ANY event that does not dispense a TypeError
 * upon construction can be safely used with the Notion API or any other without causing
 * inconsistencies in what Notion or other API's may store.
 */
export default class NotionEvent {
  // The original HostFormResponse object used to generate this NotionEvent.
  private response: HostFormResponse;

  // The calendar ID for the location where the Notion Event should exist in.
  private parentCalendarId: string;

  /**
   * Set the parent calendar ID.
   */
  public setCalendarId(id: string): void {
    this.parentCalendarId = id;
  }

  // The name of the Event. (the Title of the Notion Page)
  private name: string;

  /**
   * Gets the name of this Event.
   * @returns The name of this Event.
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Gets the original HostFormResponse object the Event was created from.
   * @returns The original HostFormResponse object.
   */
  public getHostFormResponse(): HostFormResponse {
    return this.response;
  }

  // The funding status for the Event.
  private fundingStatus: 'Funding Not Requested'
  | 'Funding TODO'
  | 'AS Forms Submitted'
  | 'AS Funding Approved'
  | 'Funding Completed'
  | 'Waiting for Reimbursement'
  | 'Funding CANCELLED'
  | 'Funding in Progress'
  | 'PEEF  to be completed'
  | 'PEEF Completed';

  // The type of event. This can involve other Events, like Non-Events
  // or Meetings.
  private type: EventType;

  // The status of PR's management of the Event.
  private prStatus: 'PR Not Requested'
  | 'PR TODO'
  | 'PR Completed'
  | 'PR In Progress'
  | 'PR Done'
  | 'PR Unconfirmed Details'
  | 'PR Waiting for link update'
  | 'PR Cancelled';

  // The status of the CSI Intake Form submission required for this Event.
  private intakeFormStatus: 'Intake Form N/A'
  | 'Intake Form TODO'
  | 'Intake Form In Progress'
  | 'Intake Form Pending Approval'
  | 'Intake Form Completed'
  | 'Intake Form CANCELLED';

  // The status of the TAP Form submission required for this Event, if any.
  private TAPStatus: 'TAP N/A'
  | 'TAP TODO'
  | 'TAP In Progress'
  | 'TAP Pending Approval'
  | 'TAP Approved'
  | 'TAP Denied'
  | 'TAP CANCELLED';

  // A copy of the CSI Intake form approval.
  private approvedIntake: File | null;

  // Whether this event has a sponsor that will pay for this event.
  private fundingSponsor: 'Yes' | 'No';

  // The Funding Manager designated to get funding for this Event.
  private fundingManager: NotionUser | null;
  
  // The description used by the host form submitter to describe the event.
  private description: string;

  // The description used by Marketing to advertise this Event.
  private marketingDescription: string;

  // Any additional info the Finance Team may need to manage this Event.
  private additionalFinanceInfo: string;

  // The Location for this Event.
  private location: EventLocation;

  // The first backup location for this Event.
  private locationBackup1: EventLocation | null;

  // The backup to the backup location for this Event.
  private locationBackup2: EventLocation | null;

  // The time that a Booking has been made for this Event.
  //
  // This time closely matches the time for the Event itself, but NOT necessarily
  // perfectly. Usually, bookings are made to overcompensate for the time an Event
  // actually takes place. This is to accomodate for any prep needed for a given
  // Event.
  private bookingTime: DateTime | null;
  
  // Any additional requests with regards to the Recording requirements of an Event.
  private recordingRequests: string;

  // The invoice for food funding.
  private foodInvoice: File | null;

  // The Event Coordinator assigned to manage this Event.
  private eventCoordinator: NotionUser | null;
  
  // Would we ever import a thumbnail? Probably not.
  // private youtubeThumbnail: File;

  // The Check-in Code assigned to this Event.
  private checkinCode: string;

  // The Facebook Co-Host assigned to this Event.
  private fbCoHost: string;

  // Whether this Event requires a recording.
  private recording: 'Yes' | 'No';

  // The status for the booking required for this Event, if any.
  private bookingStatus: 'Booking N/A'
  | 'Booking TODO'
  | 'Booking In Progress'
  | 'Booking Completed'
  | 'Booking CANCELLED';

  // The organizations involved in hosting this Event.
  private organizations: StudentOrg[];

  // Keep this, maybe?
  // private fbCoverPhoto: File;

  // The status of the CSI Intake Form submission required for this Event, if any.
  private csiFormStatus: 'CSI Form N/A'
  | 'CSI Form TODO'
  | 'CSI Form In Progress'
  | 'CSI Form Done';

  // The Projected attendance for this Event.
  private projectedAttendance: number;

  // The URL of the location for this Event.
  private locationURL: URL | null;

  // The YouTube link for the recording of this Event, if any.
  private youtubeLink: URL | null;

  // Any additional PR requests requests by the submitters of this Event.
  private prRequests: string;
  
  // The place or team from which the AV equipment from this Event was acquired from.
  private avEquipment: 'From Venue'
  | 'From ECE Department'
  | 'From University Centers Tech'
  | 'From ACM'
  | 'N/A';

  // Any additional tech requests by the submitters of this Event.
  private techRequests: string;

  // The Google Drive link for the recording assigned to this Event.
  private driveLink: URL | null;

  // The time at which the food required for thie event needs to be picked up.
  private foodPickupTime: DateTime | null;

  // TODO Consider replacing this with booleans.
  // To be honest, checking for strings named like this
  // is stupid. We should probably just use booleans
  // and convert when uploading to Notion.

  // Whether a projector is required for this Event.
  private projectorStatus: 'Yes' | 'No';

  // I am not sure I need to keep this.
  // private otherGraphics: File[];

  // The hosts of this Event.
  private hostedBy: NotionUser[] | null;
 
  // Any details with regards to the location selection for this Event.
  private locationDetails: string;

  // The sources of funding used for this Event.
  private fundingSource: ('AS'
  | 'CSE Department'
  | 'ECE Department'
  | 'Internal')[];

  // Don't know if I need this either.
  // Keep?
  // private bookingConfirmation: File[];

  // The PR Manager assigned to manage this Event.
  private prManager: NotionUser | null;

  // The time at which this Event takes place.
  private date: Interval;

  // The items requests for this Event to be able to be run.
  private requestedItems: string;

  // Non food requested items for the event.
  private nonFoodRequests: string;

  // Specifications as to the YouTube video requirements for this Event, if any.
  private uploadToYoutube: 'Yes I would like the Events team to handle the all aspects of recording for my event'
  // This answer is SO long. This is making me consider
  // declaring constants of these strings. I'll consider it.
  // eslint-disable-next-line max-len
  | 'Yes I will post a link to the recording on the Notion calendar after the event so that the Events team can upload it for me'
  | 'Yes and I will upload it to the ACM YouTube channel myself'
  | 'No I do not want anything uploaded to YouTube';

  // The ACMURL for the Facebook Events page for this Event, if any. 
  private fbACMURL: URL | null;

  // Notes with regards to the date and times this Event will be hosted at.
  private dateTimeNotes: string;

  // The Historian On-Site to take pictures for this event, if any.
  private historianOnsite: NotionUser | null;

  constructor(formResponse: HostFormResponse) {
    this.response = formResponse;
    this.name = formResponse['Event name'];
    this.description = formResponse['Event description'];
    this.fundingStatus = formResponse['Will your event require funding?'] === 'Yes'
      ? 'Funding TODO'
      : 'Funding Not Requested';
    this.type = isEventType(formResponse['What kind of event is this?'])
      ? formResponse['What kind of event is this?']
      : 'Other (See Comments)';
    this.prStatus = formResponse['Will your event require marketing?']
      === 'No, do not market my event at all. (Meetings, etc.)'
      ? 'PR Not Requested'
      : 'PR TODO';
    this.intakeFormStatus = needsIntakeForm(formResponse);
    this.TAPStatus = needsTAPForm(formResponse);
    this.fundingSponsor = formResponse['Is there a sponsor that will pay for this event?'] === 'Yes' ? 'Yes' : 'No';
    this.fundingManager = null;
    // This question is also equally long.
    // eslint-disable-next-line max-len
    this.additionalFinanceInfo = formResponse['Any additional funding details?'];
    this.location = notionLocationTag[formResponse['First choice for venue']] || 'Other (See Details)';
    this.locationBackup1 = notionLocationTag[formResponse['Second choice for venue']] || 'Other (See Details)';
    this.locationBackup2 = notionLocationTag[formResponse['Third choice for venue']] || 'Other (See Details)';
    if (formResponse['Where is your event taking place?'] === 'My event is on Zoom') {
      this.location = 'Zoom (See Details)';
    }
    if (formResponse['Where is your event taking place?'] === 'My event is on Discord only') {
      this.location = 'Discord (See Details)';
      this.locationBackup1 = null;
      this.locationBackup2 = null;
    }
    if (formResponse['Where is your event taking place?'] === 'My event is off campus') {
      this.location = 'Off Campus';
      this.locationBackup1 = null;
      this.locationBackup2 = null;
    }
    this.bookingTime = null;
    // Bruh.
    // eslint-disable-next-line max-len
    this.recordingRequests = formResponse['If yes to the previous question, do you have any special recording requests?'];
    this.eventCoordinator = null;
    this.checkinCode = formResponse['Check-in Code'];
    this.fbCoHost = '';
    this.recording = needsRecording(formResponse);
    this.bookingStatus = needsBooking(formResponse);
    this.organizations = filterOrgsResponse(formResponse);
    // If no TAP form and not off-campus, TODO, else N/A.
    this.csiFormStatus =
      // if no TAP form needed for event...
      this.TAPStatus === 'TAP N/A'
      // and event is not off-campus...
      && !(this.location === 'Off Campus')
      // ...we need a CSI form; otherwise, no.
        ? 'CSI Form TODO' : 'CSI Form N/A';
    this.projectedAttendance = parseInt(formResponse['Estimated Attendance?']) || -1;
    // Add a check to ensure no ill-written URL's are included.
    // Basically, try to fix classic shortenings of ACMURL's, and if there's still a URL parse error
    // Just warn the console and set the URL as null.
    //
    // TODO Ask host form to validate URL input fields as URL's.
    try {
      if (formResponse['Event Link (ACMURL)'].startsWith('acmurl.com')) {
        this.locationURL = new URL('https://' + formResponse['Event Link (ACMURL)']);
      } else {
        this.locationURL = formResponse['Event Link (ACMURL)'] !== ''
          ? new URL(formResponse['Event Link (ACMURL)'])
          : null; 
      }
    } catch (e) {
      Logger.warn(`Event ${this.name} has erroneous location URL input! Setting as null.`, {
        input: formResponse['Event Link (ACMURL)'],
      });
      this.locationURL = null;
    }
    this.youtubeLink = null;
    this.prRequests = formResponse['Any additional comments or requests?'];
    this.avEquipment = this.recording === 'Yes' ?  'From Venue' : 'N/A';
    this.techRequests = formResponse['If you need tech or equipment, please specify here'];
    this.driveLink = null;
    this.foodPickupTime = getFoodPickupTime(formResponse);
    this.projectorStatus = formResponse['Will you need a projector and/or other tech?'] === 'Yes' ? 'Yes' : 'No';
    this.hostedBy = [];
    this.locationDetails = this.location === 'Other (See Details)' ? formResponse['Other venue details?'] : '';
    this.fundingSource = [];
    this.prManager = null;
    this.date = getEventInterval(formResponse);
    this.requestedItems = formResponse['What food do you need funding for?'];
    this.nonFoodRequests = formResponse['Non-food system requests: Vendor website or menu'];
    // I'm so done with this.
    // eslint-disable-next-line max-len
    this.uploadToYoutube = notionYoutubeAnswer[formResponse['Will you want a recording of your event uploaded to the ACM YouTube channel?']];
    // Add a check to ensure no ill-written URL's are included.
    // Basically, try to fix classic shortenings of ACMURL's, and if there's still a URL parse error
    // Just warn the console and set the URL as null.
    //
    // TODO Ask host form to validate URL input fields as URL's.
    try {
      if (formResponse['What FB ACMURL do you want for the Facebook event page?'].startsWith('acmurl.com')) {
        this.fbACMURL = new URL('https://' + formResponse['What FB ACMURL do you want for the Facebook event page?']);
      } else {
        this.fbACMURL = formResponse['What FB ACMURL do you want for the Facebook event page?'] !== ''
          ? new URL(formResponse['What FB ACMURL do you want for the Facebook event page?'])
          : null; 
      }
    } catch (e) {
      Logger.warn(`Event ${this.name} has erroneous FB ACMURL input! Setting as null.`, {
        input: formResponse['What FB ACMURL do you want for the Facebook event page?'],
      });
      this.fbACMURL = null;
    }
    this.dateTimeNotes = formResponse['Additional Date/Time Notes'];
    this.historianOnsite = null;
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
        database_id: this.parentCalendarId,
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
        'PR Status': {
          select: { name: this.prStatus },
        },
        'CSI Form Status': {
          select: { name: this.csiFormStatus },
        },
        'Intake Form Status': {
          select: { name: this.intakeFormStatus },
        },
        'TAP Status': {
          select: { name: this.TAPStatus },
        },
        // "Funding Manager" omitted.
        // 
        // We don't know how to set this yet.

        // "Marketing Description" omitted.
        //
        // The form does not exactly provide a specific way to deduce this.
        ...(this.additionalFinanceInfo ? {
          'Additional Finance Info': {
            rich_text: toNotionRichText(this.additionalFinanceInfo),
          },
        } : {}),
        'Location': {
          select: { name: this.location },
        },
        // Booking Time omitted.

        ...(this.recordingRequests ? {
          'Recording Requests': {
            rich_text: toNotionRichText(this.recordingRequests),
          },
        } : {}),

        // "Event Coordinator" omitted.
        //
        // EC's will assign themselves an event to deal with, per
        // spec of pipeline.
        
        // "Check-in Code" omitted.
        //
        // This is set by EC's and Marketing, not us.

        ...(this.fbCoHost ? {
          'FB CoHost': {
            rich_text: toNotionRichText(this.fbCoHost),
          },
        } : {}),

        'Recording': {
          select: { name: this.recording },
        },
        'Booking Status': {
          select: { name: this.bookingStatus },
        },
        'Organizations': {
          multi_select: this.organizations.map((org) => {
            return { name: org };
          }),
        },
        // "FB Cover Photo" omitted.
        //
        // We don't add it in the pipeline, at least for now?

        // If we have any backup locations, add them. Else, just don't.
        //
        // FYI, spreading empty objects does nothing.
        ...(this.locationBackup1 ? {
          'Location Backup 1': {
            select: { name: this.locationBackup1 },
          },
        } : {}),
        ...(this.locationBackup2 ? {
          'Location Backup 2': {
            select: { name: this.locationBackup2 },
          },
        } : {}),
        'Projected Attendance': {
          number: this.projectedAttendance,
        },
        // Check whether the location URL is empty before adding it.
        //
        // This is required until the Host Form guarantees the Event Link field
        // is filled regardless of situation.
        // TODO Remove this along with null check for Event Link field.
        ...(this.locationURL ? {
          'Location URL': {
            url: this.locationURL.host + this.locationURL.pathname,
          },
        } : {}),

        // "YouTube Link" omitted.
        //
        // We don't get this from the host form.
        ...(this.checkinCode ? {
          'Check-in Code': {
            rich_text: toNotionRichText(this.checkinCode),
          },
        } : {}),

        ...(this.prRequests ? {
          'PR Requests': {
            rich_text: toNotionRichText(this.prRequests),
          },
        } : {}),

        // "AV Equipment" omitted.
        //
        // We don't automatically assign this.
        // "Drive Link" omitted.
        //
        // We don't know how to set this yet.
        ...(this.techRequests ? {
          'Tech Requests': {
            rich_text: toNotionRichText(this.techRequests),
          },
        } : {}),

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

        ...(this.locationDetails ? {
          'Location Details': {
            rich_text: toNotionRichText(this.locationDetails),
          },
        } : {}),

        ...(this.fundingSponsor ? {
          'Sponsor?': {
            select: { name: this.fundingSponsor },
          },
        } : {}),

        'Funding Source': {
          multi_select: this.fundingSource.map((fundingSource) => {
            return { name: fundingSource };
          }),
        },
        
        ...(this.foodPickupTime ? {
          'Food Pickup Time': {
            date: { 
              start: this.foodPickupTime.toISO(),
            },
          },
        } : {}),

        ...(this.description ? {
          'Event Description': {
            rich_text: toNotionRichText(this.description),
          },
        } : {}),

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

        ...(this.requestedItems ? {
          'Requested Items': {
            rich_text: toNotionRichText(this.requestedItems),
          },
        } : {}),

        ...(this.nonFoodRequests ? {
          'Non-food Requests': {
            rich_text: toNotionRichText(this.nonFoodRequests),
          },
        } : {}),

        'Upload to Youtube?': {
          select: { name: this.uploadToYoutube },
        },
        ...(this.fbACMURL ? {
          'FB ACMURL': {
            url: this.fbACMURL.host + this.fbACMURL.pathname,
          },
        } : {}),

        ...(this.dateTimeNotes ? {
          'Date/Time Notes': {
            rich_text: toNotionRichText(this.dateTimeNotes),
          },
        } : {}),
        // "Historian Onsite" omitted.
        //
        // We don't know this yet.
      },
    };

    // Upload the event to Notion's API. If this errors, out, we'll need to
    // send a message to Discord paging me about the issue.
    //
    // For now, just throw the error.
    const response = await client.pages.create(createPagePayload);
    Logger.debug(`Page ${response.id} created for event "${this.name}"`);
    return response.url;
  }
}