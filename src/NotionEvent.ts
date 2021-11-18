import { DateTime } from "luxon";
import { notionLocationTag, EventLocation, EventType, HostFormResponse, isEventType, NotionUser } from "./types";

export default class NotionEvent {
  private name: string;
  private fundingStatus: 'Funding Not Requested'
  | 'Funding TODO'
  | 'Funding in Progress'
  | 'Funding Completed'
  | 'Funding CANCELLED';

  private type: EventType;

  private prStatus: 'PR Not Requested'
  | 'PR TODO'
  | 'PR Completed'
  | 'PR In Progress'
  | 'PR Done'
  | 'PR Unconfirmed Details';

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
  
  private recordingRequests: string;

  private eventCoordinator: NotionUser;
  // Would we ever import a thumbnail? Probably not.
  // private youtubeThumbnail: File;

  private checkinCode: string;

  private fbCoHost: string;

  private recording: 'Yes' | 'No';

  private bookingStatus: 'Booking N/A'
  | 'Booking TODO'
  | 'Booking In Progress'
  | 'Booking Completed';

  private fbLink: URL;
  private organizations: ('ACM General'
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
  | 'Phi Beta Lambda')[];

  // Keep this, maybe?
  // private fbCoverPhoto: File;

  private prManager: NotionUser;
  private date: DateTime;
  private uploadToYoutube: 'Yes I would like the Events team to handle the all aspects of recording for my event'
  | 'Yes I will post a link to the recording on the Notion calendar after the event so that the Events team can upload it for me'
  | 'Yes and I will upload it to the ACM YouTube channel myself'
  | 'No I do not want anything uploaded to YouTube';

  private fbACMURL: URL;
  private dateTimeNotes: string;
  private historianOnsite: NotionUser;

  constructor(formResponse: HostFormResponse) {
    this.name = formResponse["Event name"];
    this.fundingStatus = formResponse['Will your event require funding?'] === 'Yes' ? 'Funding TODO' : 'Funding Not Requested';
    this.type = isEventType(formResponse['What kind of event is this?'])
      ? formResponse['What kind of event is this?']
      : 'Other (See Comments)';
    this.TAPStatus = needsTAPForm(formResponse['Where is your event taking place?']);
    this.prStatus = formResponse['Will your event require marketing?'] === 'No, do not market my event at all. (Meetings, etc.)'
      ? 'PR Not Requested'
      : 'PR TODO';
    this.fundingManager = null;
    this.marketingDescription = formResponse['Any additional comments or requests?'];
    this.additionalFinanceInfo = formResponse['Anything else you would like to let the Finance Team know about your event?'];
    this.location = notionLocationTag[formResponse['First choice for venue']] || 'Other (See Details)';
    this.locationBackup1 = notionLocationTag[formResponse['Second choice for venue']] || 'Other (See Details)';
    this.locationBackup2 = notionLocationTag[formResponse['Third choice for venue']] || 'Other (See Details)';
};

const needsTAPForm = (argument: string): 'TAP N/A' | 'TAP TODO' => {
  return (argument === "My event is on Zoom, but I'll use a normal room"
  || argument === "My event is on Discord only"
  || argument === "My event is off campus") ? 'TAP N/A' : 'TAP TODO';
};
