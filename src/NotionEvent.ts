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
} from './types';

const needsTAPForm = (response: HostFormResponse): 'TAP N/A' | 'TAP TODO' => {
  return (response['Where is your event taking place?'] === "My event is on Zoom, but I'll use a normal room"
  || response['Where is your event taking place?'] === 'My event is on Discord only'
  || response['Where is your event taking place?'] === 'My event is off campus')
    ? 'TAP N/A'
    : 'TAP TODO';
};

const needsIntakeForm = (response: HostFormResponse): 'Intake Form N/A' | 'Intake Form TODO' => {
  return (response['Where is your event taking place?'] === "My event is on Zoom, but I'll use a normal room"
  || response['Where is your event taking place?'] === 'My event is on Discord only'
  || response['Where is your event taking place?'] === 'My event is off campus')
    ? 'Intake Form N/A'
    : 'Intake Form TODO';
}

const needsBooking = (response: HostFormResponse): 'Booking N/A' | 'Booking TODO' => {
  return (response['Where is your event taking place?'] === 'I need a room on campus'
  || response['Where is your event taking place?'] === "My event is on Zoom, but I'll use a normal room") 
    ? 'Booking TODO'
    : 'Booking N/A';
};

const needsRecording = (response: HostFormResponse): 'Yes' | 'No' => {
  return (response['Will you want a recording of your event uploaded to the ACM YouTube channel?'] === 'Yes'
  || response['Will you want a recording of your in person event uploaded to the ACM YouTube channel? '] === 'Yes')
    ? 'Yes'
    : 'No';
};

const filterOrgsResponse = (response: HostFormResponse): StudentOrg[] => {
  return response['Which of the following organizations are involved in this event?']
    .split(', ')
    .filter((studentOrg) => isStudentOrg(studentOrg)) as StudentOrg[];
};

const getEventInterval = (response: HostFormResponse): Interval => {
  return Interval.fromDateTimes(
    DateTime.fromFormat(`${response['Preferred date']} ${response['Preferred start time']}`, 'MM/dd/YYYY h:mm:ss a'),
    DateTime.fromFormat(`${response['Preferred date']} ${response['Preferred end time']}`, 'MM/dd/YYYY h:mm:ss a'),
  );
};

export default class NotionEvent {
  private name: string;

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

  private type: EventType;

  private prStatus: 'PR Not Requested'
  | 'PR TODO'
  | 'PR Completed'
  | 'PR In Progress'
  | 'PR Done'
  | 'PR Unconfirmed Details'
  | 'PR Waiting for link update';

  private intakeFormStatus: 'Intake Form N/A'
  | 'Intake Form TODO'
  | 'Intake Form In Progress'
  | 'Intake Form Pending Approval'
  | 'Intake Form Completed'
  | 'Intake Form CANCELLED';

  private TAPStatus: 'TAP N/A'
  | 'TAP TODO'
  | 'TAP In Progress'
  | 'TAP Pending Approval'
  | 'TAP Approved'
  | 'TAP Denied'
  | 'TAP CANCELLED';

  private fundingManager: NotionUser | null;

  private marketingDescription: string;

  private additionalFinanceInfo: string;

  private location: EventLocation;

  private locationBackup1: EventLocation;

  private locationBackup2: EventLocation;

  private bookingTime: DateTime | null;
  
  private recordingRequests: string;

  private eventCoordinator: NotionUser | null;
  
  // Would we ever import a thumbnail? Probably not.
  // TODO Find out if we need this property at all.
  // private youtubeThumbnail: File;

  private checkinCode: string;

  private fbCoHost: string;

  private recording: 'Yes' | 'No';

  private bookingStatus: 'Booking N/A'
  | 'Booking TODO'
  | 'Booking In Progress'
  | 'Booking Completed'
  | 'Booking CANCELLED';

  private organizations: StudentOrg[];

  // Keep this, maybe?
  // TODO Find out if we need this property at all.
  // private fbCoverPhoto: File;

  private csiFormStatus: 'CSI Form N/A'
  | 'CSI Form TODO'
  | 'CSI Form In Progress'
  | 'CSI Form Done'

  private projectedAttendance: number;

  private locationURL: URL | null;

  private youtubeLink: URL | null;

  private prRequests: string;
  
  private avEquipment: 'From Venue'
  | 'From ECE Department'
  | 'From University Centers Tech'
  | 'From ACM'
  | 'N/A';

  private driveLink: URL | null;

  // TODO Consider replacing this with booleans.
  // To be honest, checking for strings named like this
  // is stupid. We should probably just use booleans
  // and convert when uploading to Notion.
  private projectorStatus: 'Yes' | 'No';

  // I am not sure I need to keep this.
  // private otherGraphics: File[];

  private hostedBy: NotionUser[] | null;
  
  private locationDetails: string;

  private fundingSource: ('AS'
  | 'CSE Department'
  | 'ECE Department'
  | 'Internal')[];

  // Don't know if I need this either.
  // Keep?
  // private bookingConfirmation: File[];

  private prManager: NotionUser;

  private date: Interval;

  private requestedItems: string;

  private uploadToYoutube: 'Yes I would like the Events team to handle the all aspects of recording for my event'
  // This answer is SO long. This is making me consider
  // declaring constants of these strings. I'll consider it.
  // eslint-disable-next-line max-len
  | 'Yes I will post a link to the recording on the Notion calendar after the event so that the Events team can upload it for me'
  | 'Yes and I will upload it to the ACM YouTube channel myself'
  | 'No I do not want anything uploaded to YouTube';

  private fbACMURL: URL;

  private dateTimeNotes: string;

  private historianOnsite: NotionUser;

  constructor(formResponse: HostFormResponse) {
    this.name = formResponse['Event name'];
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
    this.fundingManager = null;
    this.marketingDescription = formResponse['Any additional comments or requests?'];
    // This question is also equally long.
    // eslint-disable-next-line max-len
    this.additionalFinanceInfo = formResponse['Anything else you would like to let the Finance Team know about your event?'];
    this.location = notionLocationTag[formResponse['First choice for venue']] || 'Other (See Details)';
    this.locationBackup1 = notionLocationTag[formResponse['Second choice for venue']] || 'Other (See Details)';
    this.locationBackup2 = notionLocationTag[formResponse['Third choice for venue']] || 'Other (See Details)';
    this.bookingTime = null;
    // Bruh.
    // eslint-disable-next-line max-len
    this.recordingRequests = formResponse['If yes to the previous question: string; do you have any special recording requests?'];
    this.eventCoordinator = null;
    this.checkinCode = '';
    this.fbCoHost = '';
    this.recording = needsRecording(formResponse);
    this.bookingStatus = needsBooking(formResponse);
    this.organizations = filterOrgsResponse(formResponse);
    // TODO Find out when this is needed and HOW?
    this.csiFormStatus = 'CSI Form N/A';
    this.projectedAttendance = parseInt(formResponse['Estimated Attendance?']) | -1;
    this.locationURL = null;
    this.youtubeLink = null;
    this.prRequests = '';
    this.avEquipment = this.recording === 'Yes' ? 'From Venue' : 'N/A';
    this.driveLink = null;
    this.projectorStatus = formResponse['Will you need a projector?'] === "Yes" ? "Yes" : "No";
    this.hostedBy = [];
    // TODO Ask what are these next 2 fields for, how do I check them
    this.locationDetails = '';
    this.fundingSource = ['Internal'];
    this.prManager = null;
    this.date = getEventInterval(formResponse);
    // TODO What is this for?
    this.requestedItems = '';
    // I'm so done with this.
    // eslint-disable-next-line max-len
    this.uploadToYoutube = formResponse['Will you want a recording of your event uploaded to the ACM YouTube channel?'] as typeof this.uploadToYoutube
    // eslint-disable-next-line max-len
    || formResponse['Will you want a recording of your event uploaded to the ACM YouTube channel?'] as typeof this.uploadToYoutube;
    this.fbACMURL = new URL('https://acmurl.com/facebook');
    this.dateTimeNotes = formResponse['Additional Date/Time Notes'];
    this.historianOnsite = null;
  }
}