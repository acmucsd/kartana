import { DateTime } from "luxon";
import { EventLocation, HostFormResponse, NotionUser } from "./types";

export default class NotionEvent {
  private name: string;
  private fundingStatus: 'Funding Not Requested'
  | 'Funding TODO'
  | 'Funding in Progress'
  | 'Funding Completed'
  | 'Funding CANCELLED';

  private type: 'Competition'
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

  private prStatus: 'PR Not Requested'
  | 'PR TODO'
  | 'PR Completed'
  | 'PR In Progress'
  | 'PR Done'
  | 'PR Unconfirmed Details';

  private TAPStatus: 'TAP N/A'
  | 'TAP TODO'
  | 'TAP In Progress'
  | 'TAP Completed';

  private fundingManager: NotionUser;

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
};