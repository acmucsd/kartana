import { Client } from '@notionhq/client';
import Logger from '../utils/Logger';
import { notionCalSchema, googleSheetSchema } from '../assets';
import { GetDatabaseResponse, PageObjectResponse, PropertyFilter } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';
import { groupBy, isEqual } from 'lodash';
import NotionCalEvent from './NotionCalEvent';
import { BotSettings, GoogleSheetsSchemaMismatchError, HostFormResponse, NotionSchemaMismatchError } from '../types';
import { GoogleSpreadsheet, GoogleSpreadsheetRow, ServiceAccountCredentials } from 'google-spreadsheet';
import { ColorResolvable, MessageEmbed, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';

/**
 * Logs into Notion.
 *
 * @returns The Notion Client object.
 */
export const getNotionAPI = async (notionToken: string) => {
  return new Client({ auth: notionToken });
};

/**
 * Make sure that the current assigned Notion database has a proper schema for us
 * to run the sync script on.
 *
 * This function should be run before any modifications to the database are made.
 * @param database The Notion Database we are running modifications on.
 */
export const validateNotionDatabase = (database: GetDatabaseResponse) => {
  const databaseDiff = diff(notionCalSchema, database.properties);
  if (databaseDiff.length !== 0) {
    Logger.error('Notion Calendar schema is mismatched! Halting!', {
      type: 'error',
      diff: databaseDiff,
    });
    throw new NotionSchemaMismatchError(databaseDiff);
  }
};

/**
 * Validates the headers in the host form CSV to ensure they match the downloaded schema.
 *
 * This should be run before any other modifications to the Notion database OR Google Sheet are made.
 * @param headers The headers from the Host Form response sheet.
 */
export const validateGoogleSheetsSchema = (headers) => {
  if (!isEqual(headers, googleSheetSchema)) {
    const schemaDiff = diff(googleSheetSchema, headers);
    Logger.error('Google Sheets schema is mismatched! Halting!', {
      type: 'error',
      diff: schemaDiff,
    });
    throw new GoogleSheetsSchemaMismatchError(schemaDiff);
  }
};

/**
 * Converts a Google Spreadsheets API row into our interface for host form responses.
 *
 * We do this by creating an object with values obtained from each getter of our spreadsheet row.
 * In other words, iterate over our header values from the Google Sheet and get each value from the
 * original GoogleSpreadsheetRow, thus turning it into an object compliant to our HostFormResponse
 * interface.
 *
 * This method is useful because it makes our code as type-safe as possible, making it easier to handle
 * business logic.
 *
 * @param headers the headers of our Host Form.
 * @param row The Google Spreadsheet row from the Host Form.
 */
export const toHostFormResponse = (headers: string[], row: GoogleSpreadsheetRow): HostFormResponse => {
  const hostFormResponse = {};
  headers.forEach((header) => {
    hostFormResponse[header] = row[header];
  });
  return hostFormResponse as HostFormResponse;
};

/**
 * Gets a parsed version of our Host Form response sheet.
 *
 * This takes the Google Sheet we are interested in and converts each row
 * into a type-compliant interface. We also keep the original headers and rows
 * for later perusal.
 *
 * @returns An object containing the header values of the host form, the rows themselves,
 * and their individual parsed versions.
 */
export const getHostForm = async (hostFormDoc: GoogleSpreadsheet, hostFormSheetName: string) => {
  await hostFormDoc.loadInfo();
  const sheet = hostFormDoc.sheetsByTitle[hostFormSheetName];
  const checkboxSheet = hostFormDoc.sheetsByTitle['Notion Event Pipeline'];
  const rows = await sheet.getRows();
  const checkboxRows = await checkboxSheet.getRows();
  // Save the form headers, but remove everything else
  const headers = sheet.headerValues;
  // return the parts of the sheet separately, for easier management later
  return {
    headers,
    rows,
    checkboxRows,
    data: rows.map((row) => toHostFormResponse(headers, row)),
  };
};

export interface EventNotionPipelineConfig {
  settings: BotSettings;
  channel: TextChannel;
  googleSheetAPICredentials: ServiceAccountCredentials;
}

/**
 * Sync the Host Form response Google Sheet to our internal Notion calendar.
 *
 * This pipeline is fairly convoluted, but essentially it does the following:
 * - Read the entire host form response spreadsheet
 * - Look for any events that don’t have the “Imported to Notion” column checkbox ticked
 * - For each event, convert to something Notion’s API can read, per the business logic EC's normally use
 * - Upload to Notion using their API.
 * - Tick the checkbox for “Imported to Notion” on the spreadsheet.
 * - Alert the Discord of any errors or successfuly imported events.
 *
 */
export const syncHostFormToNotionCalendar = async (config: EventNotionPipelineConfig) => {
  Logger.info('Syncing Host Form to Notion Calendar...');
  Logger.debug('Getting API clients...');
  // The Notion API is easy enough to get.
  const notion = await getNotionAPI(config.settings.notionIntegrationToken);
  // Get the Discord channel as well.
  const channel = config.channel;

  // Getting our Google Spreasheet is harder, but not by much.
  // This is using the `google-spreadsheet` NPM package, but we need to basically
  // pass our service account so we have read-write access to the spreadsheet.
  //
  // This requires the Google Sheet to give Editor access to the pipeline GCS
  // service account, but that will be in the Markdown docs for the repo.
  const hostFormDoc = new GoogleSpreadsheet(config.settings.googleSheetsDocID);
  // Jank file path hack because our code for the pipeline is not at root dir.
  await hostFormDoc.useServiceAccountAuth(config.googleSheetAPICredentials);

  Logger.info('Downloading Google Sheet data...');
  const hostForm = await getHostForm(hostFormDoc, config.settings.googleSheetsSheetName);
  Logger.info('Getting Notion Calendar...');

  // TODO Consider making a function for this MAYBE.
  //
  // I mean, it's just two lines, but maybe some other part of the pipeline might
  // need it later.
  //
  // Considering this microservice will probably do a ton of other things, this will probably
  // become a function, if not part of a manager.
  const databaseId = config.settings.notionCalendarID;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  // Validate both the Notion Calendar and the Google Sheet.
  //
  // This is important because we do not want our pipeline to run unless there are NO
  // changes to the Notion database and the host form, because we'll probably break business
  // logic and other things.
  //
  // I'll probably configure an error transport for Winston so that errors automatically get
  // reported to Dev Team when this whole thing breaks.
  Logger.debug('Validating schemas for data sources...');
  Logger.debug('Validating Notion database schema...');
  validateNotionDatabase(database);

  Logger.debug('Validating Google Sheets schema...');
  validateGoogleSheetsSchema(hostForm.headers);

  Logger.info('Pipeline ready! Running.');
  Logger.info(`${hostForm.data.length} rows in Host Form CSV detected. Checking for new events...`);
  // Get the events we have to import.
  //
  // We'll have a function keeping track of the HostFormResponses we have to convert,
  // but we also want to keep track of the original rows from the Google Spreadsheet to tick
  // the corresponding checkbox for the imported event.
  //
  // This raises a question on whether to keep the GoogleSpreadsheetRow in the NotionEvent class or not,
  // but that's a design decision I'll run around a few other people before I change.
  const newEventRows: GoogleSpreadsheetRow[] = [];
  const newEvents: HostFormResponse[] = hostForm.data.filter((formResponse, index) => {
    // Google Spreadsheets' API still reports rows that are completely empty as existent
    // rows, which messes our pipeline a bit. We only want to deal with rows that contain
    // actual responses.
    //
    // While we COULD just check to see if a required field (column) has a non-empty value,
    // it's much more resilient to host form changes to simply check for a COMPLETELY empty row
    // (there's no way empty rows are actual responses, right?)
    //
    // First off, get the checkbox for the current host form response. Since sheet rows
    // are by default 1-indexed, but we keep 0-indexes, we need to subtract 2; one to switch
    // from 1-indexing to 0-indexing, and another due to the fact the row index considers
    // the header too, which we don't keep in our row arrays.
    const eventRow = hostForm.rows[index];
    const checkboxRow = hostForm.checkboxRows[eventRow.rowIndex - 2];

    // If the host form row has not been imported yet (checkbox not ticked) and it has ANY
    // non-empty values...
    if (checkboxRow['Imported to Notion'] === 'FALSE' && formResponse['Event name'] !== '') {
      // Keep track of the GoogleSpreadsheetRow in newEventRows and keep it in our filtered array.
      newEventRows.push(eventRow);
      return true;
    } else {
      return false;
    }
  }) as HostFormResponse[];

  Logger.info(`${newEvents.length} new events detected.`);

  // If we have no new events, just return. It's safer this way.
  if (newEvents.length === 0) {
    Logger.info('No events to convert! Done!');
    return;
  }

  // Sync our events to Notion calendar.
  //
  // This is kinda jank, but it works.
  // First, convert all our HostFormResponses into NotionEvents.
  Logger.info('Syncing events to Notion calendar...');
  const notionEventsToImport = newEvents.flatMap((newEvent, index) => {
    try {
      const event = new NotionCalEvent(newEvent);
      event.setCalendarId(databaseId);
      event.setHostedEventDatabaseID(config.settings.notionHostedEventsID);
      return event;
    } catch (error) {
      // If there was a TypeError (doubtful, but possible), we'll want to report it
      // to deal with the issue.
      Logger.error(`Could not convert event ${newEvent['Event name']}: ${error}`, {
        error,
        eventName: newEvent['Event name'],
      });
      newEventRows.splice(index, 1);
      // Report error in Discord as well.
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error importing event!')
        .setDescription(`**Event name:** ${newEvent['Event name']}\n**Error:** \`${error.message}\``)
        .setColor('DARK_RED');
      channel.send({
        content: `*Paging <@&${config.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
      return [];
    }
  });

  // Then take all our events that we've converted and not only
  // upload them to notion, but ALSO make sure the Google spreadsheet
  // has the checkbox ticked if there were no errors with the import.
  await Promise.all(
    notionEventsToImport.map(async (event: NotionCalEvent, index) => {
      // Upload to Notion.
      try {
        const url = await event.uploadToNotion(notion);
        // Report that we've successfully imported the event on Discord.
        const successEmbed = new MessageEmbed()
          .setTitle('📥 Imported new event!')
          .setDescription(
            `**Event name:** ${event.getName()}
          **URL:** ${url}
          **Hosted by:** ${event.getHostFormResponse()['Event director(s)']}`,
          )
          .setColor('GREEN');
        await channel.send({
          content: `<@&${config.settings.logisticsTeamID}>`,
          embeds: [successEmbed],
        });
      } catch (error) {
        // If we can't create the event, notify everone. Skip over the
        // "tick the checkbox" part, since we didn't actually import the event.
        Logger.error(`Error creating event "${event.getName()}: ${error}"`, {
          error,
          eventName: event.getName(),
        });
        const errorEmbed = new MessageEmbed()
          .setTitle('⚠️ Error creating event on Notion!')
          .setDescription(`**Event name:** ${event.getName()}\n**Error:** \`${error}\``)
          .setColor('RED');
        await channel.send({
          content: `*Paging <@&${config.settings.maintainerID}>!*`,
          embeds: [errorEmbed],
        });
        return;
      }

      // Tick the checkbox.
      //
      // Google Spreadsheets is so jank.
      // I'm surprised the 'TRUE' assignment didn't just convert the checkbox
      // to a cell with the 'TRUE' string in it. I am also glad.
      //
      // Thank God.
      const eventRow = newEventRows[index];
      const checkboxRow = hostForm.checkboxRows[eventRow.rowIndex - 2];
      checkboxRow['Imported to Notion'] = 'TRUE';

      // Update the changes to Google Spreadsheets.
      await checkboxRow.save();
    }),
  );

  // Done!
  Logger.info('All events converted!');
};

/**
 * Pings the Logistics Team for any upcoming events that need the TAP Forms or CSI Event Intake forms submitted.
 *
 * According to Logistics Team, TAP Forms or CSI Event Intake forms for any events that need them
 * need to be submitted 3 weeks before the event starts.
 *
 * This pipeline does the following:
 * - Looks up all the events in the Notion calendar database
 * - Filters for any events that are specifically 3 weeks and 1, 2 or 3 days away from today,
 *   as well as 2 weeks and 1, 2 or 3 days away from today. (in other words,
 *   anything that has TAP forms or CSI Intake forms due the next day.) Additionally, an 8-week
 *   advance for booking confirmation.
 * - Checks whether the events still need to have a TAP or CSI Event Intake form submitted.
 * - Adds all the events to two separate embed with a title and URL and pings the Logistics team about it.
 */
export const pingForTAPandCSIDeadlines = async (
  notion: Client,
  databaseId: string,
  config: EventNotionPipelineConfig,
) => {
  // Ideally, do ALL network queries in one and filter later.
  const dateTimeNow = DateTime.now();

  // Master list of all reminders in the following format:
  // title — Top of embed, bolded
  // colour — colour of embed, since GREEN was used for key pings/succesful imports, and RED is semantically errors
  // dates — further itemized by number of days in advance a reminder ping should be sent:
  //    pingroles — names of roles to be pinged, found in settings
  //    date — exact date in the future you would wish to receive pings for today
  //    prop — category, corresponds to a series of statuses on the Notion existing as "<prop> Status"
  //    propStatus — the status of the above prop category
  
  interface PingDate{
    days: number;
    pingRoles: string[];
    message: string;
    prop: string;
    propStatus: string[];
  }

  const daysToPing = [
    {
      'title': '🏦 AS Funding Deadline',
      'colour': 'BLUE',
      'dates': [
        {
          'days': 56,
          'pingRoles': ['logisticsTeamID'],
          'message': '\n⚠️ __**Booking confirmation for AS Funding is due in 1 week!**__ ⚠️\n',
          'prop': 'Booking',
          'propStatus': ['Booking TODO', 'Booking In Progress'],
        }
      ]
    },
    {
      'title': '🧾 TAP Invoice Deadline',
      'colour': 'ORANGE',
      'dates': [
        {
          'days': 14,
          'pingRoles': ['fundingTeamID', 'logisticsTeamID'],
          'message': '\n⚠️ __**Invoice for TAP is due today!**__ ⚠️\n',
          'prop': 'TAP',
          'propStatus': ['TAP In Progress'],
        },
        {
          'days': 16,
          'pingRoles': ['fundingTeamID'],
          'message': '\n __**Invoice for TAP is due in 3 days!**__ \n',
          'prop': 'TAP',
          'propStatus': ['TAP In Progress', 'TAP TODO'],
        },
        {
          'days': 21,
          'pingRoles': ['fundingTeamID'],
          'message': '\n __**Invoice for TAP is due in a week!**___ \n',
          'prop': 'TAP',
          'propStatus': ['TAP TODO'],
        },
      ]
    },
    {
      'title': '🗒️ Event Details Confirmation',
      'colour': 'YELLOW',
      'dates': [
        {
          'days': 14,
          'pingRoles': ['logisticsTeamID'],
          'message': '\n⚠️ __**Final check for all event details!**__ ⚠️\n',
          'prop': 'PR',
          'propStatus': ['PR TODO', 'PR In Progress'],
        },
        {
          'days': 21,
          'pingRoles': ['logisticsTeamID', 'marketingTeamID'],
          'message': '\n __**Double-check venue, time, food, title and description for the event!**__\n',
          'prop': 'PR',
          'propStatus': ['PR TODO', 'PR In Progress'],
        }
      ]
    },
  ];

  // Used to compile all queries by iterating over above array  
  let daysTrack = new Array<PingDate>();
  let dayQuery = new Array<PropertyFilter>();
  let statusQuery = new Array<PropertyFilter>();
  let props = new Array<string>();
  let propStatuses = new Array<string>();

  // Creates filter for all days equal to one of the above deadlines
  // Slightly jankily adds 1 day to the original deadline, just to be sure to get 24 hours buffer if there's a weird start time
  daysToPing.forEach(pingType => {
    pingType['dates'].sort((a,b) => (a.days > b.days) ? 1 : ((b.days > a.days) ? -1 : 0)) // Sorts days from soonest to latest
    Object.values(pingType['dates']).forEach(day => { 
      dayQuery.push({
        property: 'Date', 
        date: {
          equals: dateTimeNow.plus({ days: day['days']+1 }).toISODate()
        }
      });
    });
  });

  // Creates filter for all statuses equal to one of the above deadlines
  // Additionally, compile string for status selectors for isEventPingable to use
  daysToPing.forEach(pingType => {
    Object.values(pingType['dates']).forEach(curDay => {
      if(daysTrack.indexOf(curDay) == -1){
        curDay['propStatus'].forEach(curStatus => {
          statusQuery.push({ 
            property: `${curDay['prop']} Status`,
            select: { 
              equals: curStatus,
            }
          });
          daysTrack.push(curDay);
          if(propStatuses.indexOf(curStatus) == -1) propStatuses.push(curStatus);
        })
      }
      if(props.indexOf(curDay['prop']) == -1) props.push(curDay['prop']);
    });
  })

  // First, we want to pick up all of the events from the calendar.
  // We'll query with two separate requests to make it faster to bunch up all the
  // events that match the status parameters and we'll filter by date into
  // different arrays later.
  //
  // For events we're interested to ping for anyway, we'll just get
  // every event that has one of the correct status forms and has a deadline coming up
  Logger.debug('Querying Notion API for events with deadlines coming up...');
  const eventsResponse = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          or: dayQuery,
        },
        {
          or: statusQuery,
        },
      ],
    },
  });

  const allEvents = eventsResponse.results as PageObjectResponse[];

  Logger.debug(`Number of events with deadlines coming up: ${allEvents.length}`);

  // Check to see if we have no events to report. If we don't,
  // don't send any embeds and just return.
  if (allEvents.length === 0) {
    Logger.info('No events to ping for! Skipping embed building...');
    return;
  }

  /**
   * Checks whether this functions needs pinging for a particular day or status.
   *
   * @param event The event to look at.
   * @param deadlineDate The deadline date to check for.
   * @param orgPing The field to check whether it needs to be pinged or not; exists as a property 
   *                on a Notion calendar event suffixed as "<orgPing> Status"
   * @param status The corresponding status to match
   * @returns Whether the event should be pinged or not.
   */
  const isEventPingable = (
    event: (typeof allEvents)[0],
    deadlineDate: string,
    orgPing: string, 
    status: string,
  ) => {
    if (event.properties.Date.type !== 'date') return false;
    if (event.properties.Name.type !== 'title') return false;
    if (event.properties[`${orgPing} Status`].type !== 'select') return false;

    const date = (event.properties.Date.date?.start.toString())?.split('T')[0];

    // If the field is left blank on Notion, event.properties[...].select
    // will be null, so we'll automatically fill it to 'N/A' if so.
    let tmp: any = event.properties[`${orgPing} Status`];
    let propSelect = tmp.select;
    let selectStatus = propSelect ? propSelect.name : `${orgPing} N/A`;
    return date === deadlineDate && selectStatus === status;
  };

  // We loop over every possible ping section, creating an embed for each and repeating the process
  Logger.debug('Splitting events that need pinging into separate arrays... ' + daysToPing.length + " to go");
  for(let i=0; i < daysToPing.length; i++){
    let cur = daysToPing[i];
    let curEmbed = new MessageEmbed().setTitle(cur['title']).setColor(cur['colour'] as ColorResolvable);
    let curEmbedPings = new Array<string>();
    let curEmbedDescrip = "_ _";

    // Goes over every individual deadline per section (14 days, 21 days, etc), filtering from our array
    // of all possible days that might match the criteria
    Logger.info(`Beginning ${cur['title']} embed build...`);

    Object.values(cur['dates']).forEach(curPing => {
      let propDate = dateTimeNow.plus({ days: curPing['days'] }); 

      // Gets specific list of events that meet this ping's criteria of (date, correct org [TAP, PR, etc] status)
      let curDatePings = allEvents.filter((event) => {
        let ret = false;
        curPing['propStatus'].forEach(tmp => {
          ret = ret || Boolean(isEventPingable(event, propDate.toISODate(), curPing['prop'], tmp));
        })
        return ret;
      });

      // Adds on to the embed description of there is a nonzero amount of events
      if(curDatePings.length > 0){
        let weeks = Number(curPing['days']);
        curEmbedDescrip += `\n\`${propDate.toLocaleString(DateTime.DATE_FULL)} // ${Math.trunc(weeks/7).toString()} weeks${weeks%7 != 0? ", " + (weeks%7).toString() + " days" : " "}\``;
        curEmbedDescrip += curPing['message'];
        curPing['pingRoles'].forEach( ping => {
          let curRole = `<@&${config.settings[ping]}>`;
          if(curEmbedPings.indexOf(curRole) == -1){ curEmbedPings.push(curRole); }
        })
        for(let ping in curPing['pingRoles']){
          
        }

        curDatePings.forEach((event) => {
          if (event.properties.Name.type !== 'title') {
            throw new Error('Event does not have Name field of type "title"');
          }
          curEmbedDescrip +=  `- [${event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')}](${event.url}) \
hosted by **${event.properties['Hosted by']["people"][0].name}**\n`;
        });
      }
    });

    // Only will send embeds for sections that have relevant events
    if(curEmbedDescrip != "_ _"){
      curEmbed.setDescription(curEmbedDescrip);
      Logger.info(`Sections built! Sending ${cur['title']} embed...`);
      // Send the embed!
      await config.channel.send({
        content: curEmbedPings.join(' '),
        embeds: [curEmbed],
      });
    }
  }
};

/**
 * Pings the Logistics Team to remind them to get keys for particular rooms that require them.
 *
 * All rooms in DIB, CSE (apart from CSE B225/"The Fishbowl"), the ASML Room in SME, or the Qualcomm Room require key codes/cards
 */
const keyPingDays = 4; // Decided 4 to give event coordinators extra notice in advance of weekends
const keyTextLocs = "Qualcomm, DIB, CSE, SME rooms";
const keyCardLocs = ['Design and Innovation Building 202/208'];
const keyCodeLocs = ['CSE 1202', 'CSE 2154', 'CSE 4140', 'Qualcomm Room', 'SME ASML Room'];
const allLocs = keyCardLocs.concat(keyCodeLocs);

export const pingForKeys = async (notion: Client, databaseId: string, config: EventNotionPipelineConfig) => {
  const keyPingDate = DateTime.now().setZone('America/Los_Angeles').plus({ days: keyPingDays });
  Logger.debug(`Querying Notion API for events on date ${keyPingDate.toISODate()} in ${keyTextLocs}...`);
  const eventsResponse = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'Date',
          date: {
            equals: keyPingDate.toISODate(),
          },
        },
        {
          or: allLocs.map((location) => {
            return {
              property: 'Location',
              select: {
                equals: location,
              },
            };
          }),
        },
      ],
    },
  });

  const allEvents = eventsResponse.results as PageObjectResponse[];

  Logger.debug(`Querying Notion API for events on date ${keyPingDate.toISODate()} in ${keyTextLocs}...`);
  const activeEvents = allEvents.filter((event) => {
    if (event.properties.Type.type !== 'select') {
      throw new TypeError(`Event Type field for event not a SELECT! (Event URL: ${event.url}`);
    }
    return event.properties.Type.select?.name !== 'CANCELLED';
  });

  // Check if there are any events to actually ping for.
  if (activeEvents.length === 0) {
    Logger.info('No events to ping for! Skipping embed building...');
    return;
  }

  // Group the events depending on which location they're in. This way, we can build
  // the embed much easier later on.
  const eventsByLocation = groupBy(activeEvents, (event) => {
    if (event.properties.Location.type !== 'select') {
      throw new TypeError(`Location field for event not a SELECT! (Event URL: ${event.url}`);
    }
    return event.properties.Location.select?.name;
  });

  let keyPingDescription = '';

  // For each location, setup a header for the set of events that are in that location
  // and then list the names for each, along with the title, like the other pings
  // we send.
  Object.entries(eventsByLocation).forEach(([location, events]) => {
    let needed = keyCardLocs.includes(location) ? "card" : "code";
    keyPingDescription += `_${location} needs a key ${needed} for these events:_\n`;
    events.forEach((event) => {
      if (event.properties.Name.type !== 'title') {
        throw new TypeError(`Title field for event not a title! (Event URL: ${event.url}`);
      }
      keyPingDescription += `- **${event.properties['Hosted by']["people"][0].name}** \
hosting [${event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')}](${
        event.url
      })\n`;
    });
    keyPingDescription += '\n';
  });

  // Now that we have all of them grouped up, we can build the embed.
  const keyPingEmbed = new MessageEmbed()
    .setTitle(`Key cards/codes on ${keyPingDate.toLocaleString(DateTime.DATE_FULL)}`)
    .setColor('GREEN')
    .setDescription(keyPingDescription)

  await config.channel.send({
    content: `<@&${config.settings.logisticsTeamID}>`,
    embeds: [keyPingEmbed],
  });

  Logger.info('Pinged for key card/codes!');
};

/**
 * Pings for any deadlines and reminders that the Teams might need for any sort of event-related task.
 *
 * This includes:
 * - TAP and CSI Event Intake Form deadlines
 * - Key reminders for Qualcomm, DIB, CSE, ASML (SME) rooms
 * - AS Funding deadline reminders
 *
 * @param config The config for the pipeline.
 */
export const pingForDeadlinesAndReminders = async (config: EventNotionPipelineConfig) => {
  Logger.info('Setting up TAP deadline pings...');
  Logger.debug('Getting API clients...');
  // The Notion API is easy enough to get.
  const notion = await getNotionAPI(config.settings.notionIntegrationToken);

  Logger.info('Getting Notion Calendar...');

  const databaseId = config.settings.notionCalendarID;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  // Validate the Notion Calendar.
  Logger.debug('Validating schemas for data sources...');
  Logger.debug('Validating Notion database schema...');
  validateNotionDatabase(database);

  Logger.info('Pipeline ready! Running.');

  pingForTAPandCSIDeadlines(notion, databaseId, config);
  pingForKeys(notion, databaseId, config);

  // Done!
  Logger.info('All reminders and deadlines pinged!');
};