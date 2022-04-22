import { Client } from '@notionhq/client';
import Logger from '../utils/Logger';
import { notionCalSchema, googleSheetSchema } from '../assets';
import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';
import { groupBy, isEqual } from 'lodash';
import NotionEvent from './NotionEvent';
import { BotClient, GoogleSheetsSchemaMismatchError, HostFormResponse, NotionSchemaMismatchError } from '../types';
import { GoogleSpreadsheet, GoogleSpreadsheetRow, ServiceAccountCredentials } from 'google-spreadsheet';
import { MessageEmbed, TextChannel, WebhookClient } from 'discord.js';
import { DateTime } from 'luxon';
import { getCurrentQuarter, getQuarter, quarters } from 'ucsd-quarters-years';

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
  logisticsTeamId: string;
  maintainerId: string;
  hostFormSheetId: string;
  hostFormSheetName: string;
  googleSheetAPICredentials: ServiceAccountCredentials;
  notionCalendarId: string;
  webhook: WebhookClient;
  client: BotClient;
  notionToken: string;
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
  const notion = await getNotionAPI(config.notionToken);
  // Get the Discord webhook as well.
  const webhook = config.webhook;

  // Getting our Google Spreasheet is harder, but not by much.
  // This is using the `google-spreadsheet` NPM package, but we need to basically
  // pass our service account so we have read-write access to the spreadsheet.
  //
  // This requires the Google Sheet to give Editor access to the pipeline GCS
  // service account, but that will be in the Markdown docs for the repo.
  const hostFormDoc = new GoogleSpreadsheet(config.hostFormSheetId);
  // Jank file path hack because our code for the pipeline is not at root dir.
  await hostFormDoc.useServiceAccountAuth(config.googleSheetAPICredentials);

  Logger.info('Downloading Google Sheet data...');
  const hostForm = await getHostForm(hostFormDoc, config.hostFormSheetName);
  Logger.info('Getting Notion Calendar...');
  
  // TODO Consider making a function for this MAYBE.
  //
  // I mean, it's just two lines, but maybe some other part of the pipeline might
  // need it later.
  //
  // Considering this microservice will probably do a ton of other things, this will probably
  // become a function, if not part of a manager.
  const databaseId = config.notionCalendarId;
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
    if (checkboxRow['Imported to Notion'] === 'FALSE'
    && formResponse['Event name'] !== '') {
      // Keep track of the GoogleSpreadsheetRow in newEventRows and keep it in our filtered array.
      newEventRows.push(eventRow);
      return true;
    } else {
      return false;
    }
  },
  ) as HostFormResponse[];

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
      const event = new NotionEvent(newEvent);
      event.setCalendarId(databaseId);
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
        .setDescription(`**Event name:** ${newEvent['Event name']}\n**Error:** \`${error}\``)
        .setColor('DARK_RED');
      webhook.send({
        content: `*Paging <@${config.maintainerId}>!*`,
        embeds: [errorEmbed],
      });
      return [];
    }
  });

  // Then take all our events that we've converted and not only
  // upload them to notion, but ALSO make sure the Google spreadsheet
  // has the checkbox ticked if there were no errors with the import.
  await Promise.all(notionEventsToImport.map(async (event: NotionEvent, index) => {
    // Upload to Notion.
    try {
      const url = await event.uploadToNotion(notion);
      // Report that we've successfully imported the event on Discord.
      const successEmbed = new MessageEmbed()
        .setTitle('📥 Imported new event!')
        .setDescription(
          `**Event name:** ${event.getName()}
          **URL:** ${url}
          **Hosted by:** ${event.getHostFormResponse()['Event director(s)']}`)
        .setColor('GREEN');
      await webhook.send({
        content: `<@&${config.logisticsTeamId}>`,
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
      await webhook.send({
        content: `*Paging <@${config.maintainerId}>!*`,
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
  }));

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
 *   anything that has TAP forms or CSI Intake forms due the next day.)
 * - Checks whether the events still need to have a TAP or CSI Event Intake form submitted.
 * - Adds all the events to two separate embed with a title and URL and pings the Logistics team about it.
 */
export const pingForTAPandCSIDeadlines = async (notion: Client,
  webhook: WebhookClient,
  databaseId: string,
  config: EventNotionPipelineConfig) => {
  // The day for which we ping for any non-submitted events.
  // This is just basically to look for events that are 23 days away from now.
  //
  // Ideally, do ALL network queries in one and filter later.
  const firstDayToPingForTODO = DateTime.now().plus({ days: 23 });
  const secondDayToPingForTODO = DateTime.now().plus({ days: 22 });
  const thirdDayToPingForTODO = DateTime.now().plus({ days: 21 });
  const firstDayToPingForInProgress = DateTime.now().plus({ days: 16 });
  const secondDayToPingForInProgress = DateTime.now().plus({ days: 15 });
  const thirdDayToPingForInProgress = DateTime.now().plus({ days: 14 });

  // First, we want to pick up all of the events from the calendar.
  // We'll query with two separate requests to make it faster to bunch up all the
  // events that match the TAP Status parameters and we'll filter by date into
  // different arrays later.
  //
  // For events we're interested to ping for anyway, we'll just get
  // every event that has one of the correct status forms and has a deadline coming up,
  // whether it be the 21-day deadline or the 14-day deadline.
  Logger.debug('Querying Notion API for events with TAP and Event Intake deadlines coming up...');
  const eventsResponse = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          or: [
            {
              property: 'Date',
              date: {
                equals: firstDayToPingForTODO.toISODate(),
              },
            },
            {
              property: 'Date',
              date: {
                equals: secondDayToPingForTODO.toISODate(),
              },
            },
            {
              property: 'Date',
              date: {
                equals: thirdDayToPingForTODO.toISODate(),
              },
            },
            {
              property: 'Date',
              date: {
                equals: firstDayToPingForInProgress.toISODate(),
              },
            },
            {
              property: 'Date',
              date: {
                equals: secondDayToPingForInProgress.toISODate(),
              },
            },
            {
              property: 'Date',
              date: {
                equals: thirdDayToPingForInProgress.toISODate(),
              },
            },
          ],
        },
        {
          or: [
            {
              property: 'TAP Status',
              select: {
                equals: 'TAP TODO',
              },
            },
            {
              property: 'TAP Status',
              select: {
                equals: 'TAP In Progress',
              },
            },
            {
              property: 'Intake Form Status',
              select: {
                equals: 'Intake Form TODO',
              },
            },
          ],
        },
      ],
    },
  });

  const allEvents = eventsResponse.results.filter((event) => {
    if (event.properties.Type.type !== 'select') {
      throw new TypeError(`Event Type field for event not a SELECT! (Event URL: ${event.url}`);
    }
    return event.properties.Type.select.name !== 'CANCELLED';
  });

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
   * @param statusForTAP The TAP status to look at.
   * @param orgPing The type of field to check whether it needs to be pinged or not.
   * @returns Whether the event should be pinged or not.
   */
  const isEventPingable = (event: typeof allEvents[0],
    deadlineDate: DateTime,
    orgPing: 'CSI' | 'TAP',
    status: 'TAP TODO' | 'TAP In Progress' | 'Intake Form TODO') => {
    if (event.properties.Date.type !== 'date') {
      return false;
    }
    if (event.properties['TAP Status'].type !== 'select') {
      return false;
    }
    if (event.properties['Intake Form Status'].type !== 'select') {
      return false;
    }
    if (event.properties.Name.type !== 'title') {
      return false;
    }
    const date = event.properties.Date.date.start;
    const tapStatus = event.properties['TAP Status'].select.name;
    const csiStatus = event.properties['Intake Form Status'].select.name;
    
    if (orgPing === 'TAP') {
      return date === deadlineDate.toISODate() && tapStatus === status;
    } else {
      return date === deadlineDate.toISODate() && csiStatus === status;
    }
    
  };

  // There are two separate embeds we are building. One for the TAP deadlines and one for the CSI deadlines.
  // First, we'll take our original array and filter for all the events with TAP 21-day deadlines, and we'll separate
  // the events with the alerts before each deadline.
  Logger.debug('Splitting events that need pinging into separate arrays...');
  const tapDeadlineEvents = {
    firstDeadline: {
      oneDay: allEvents.filter((event) => {
        return isEventPingable(event, thirdDayToPingForTODO, 'TAP', 'TAP TODO');
      }),
      twoDays: allEvents.filter((event) => {
        return isEventPingable(event, secondDayToPingForTODO, 'TAP', 'TAP TODO');
      }),
      threeDays: allEvents.filter((event) => {
        return isEventPingable(event, firstDayToPingForTODO, 'TAP', 'TAP TODO');
      }),
    },
    secondDeadline: {
      oneDay: allEvents.filter((event) => {
        return isEventPingable(event, thirdDayToPingForInProgress, 'TAP', 'TAP In Progress');
      }),
      twoDays: allEvents.filter((event) => {
        return isEventPingable(event, secondDayToPingForInProgress, 'TAP', 'TAP In Progress');
      }),
      threeDays: allEvents.filter((event) => {
        return isEventPingable(event, firstDayToPingForInProgress, 'TAP', 'TAP In Progress');
      }),
    },
  };

  // We will do the same for the CSI Event Intake form deadline pings.
  const eventIntakeEvents = {
    oneDay: allEvents.filter((event) => {
      return isEventPingable(event, thirdDayToPingForTODO, 'CSI', 'Intake Form TODO');
    }),
    twoDays: allEvents.filter((event) => {
      return isEventPingable(event, secondDayToPingForTODO, 'CSI', 'Intake Form TODO');
    }),
    threeDays: allEvents.filter((event) => {
      return isEventPingable(event, firstDayToPingForTODO, 'CSI', 'Intake Form TODO');
    }),
  };

  let tapDeadlineEmbed: MessageEmbed | null = null;
  let eventIntakeDeadlineEmbed: MessageEmbed | null = null;

  // Now to build the embeds. By design, we'll not create a section (or an embed) unless
  // we have events to put in it, so as to have somewhat clean embeds.
  //
  // We'll still build them by embed, so we can keep all code somewhat structured.
  // Begin with TAP deadline pings. For each embed, first check if we even have deadlines
  // coming up, and if we don't skip building the embed.
  Logger.info('Beginning TAP deadline embed build...');
  if (!(Object.values(tapDeadlineEvents.firstDeadline).every((array) => array.length === 0) &&
      Object.values(tapDeadlineEvents.secondDeadline).every((array) => array.length === 0))) {
    tapDeadlineEmbed = new MessageEmbed()
      .setTitle('TAP forms are due!')
      .setColor('YELLOW');

    // Build separate strings for each section.
    let firstDeadlineSection = '_21-day Deadline_\n';
    let secondDeadlineSection = '_14-day Deadline_\n';

    // This isn't gonna be fun, but the cleanest and quickest to go about this is to individually
    // go through each sub-header of deadlines and add them to the original strings in order.
    //
    // ARGUABLY this could be marshaled from the JSON above, but this is likely more readable for
    // others in the future.
    if (tapDeadlineEvents.firstDeadline.oneDay.length !== 0) {
      firstDeadlineSection += '\n⚠️ **TAP Forms due today!** ⚠️\n';
      tapDeadlineEvents.firstDeadline.oneDay.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        // Make a hyperlink with the title as the text and the Notion page URL as the link.
        // The reduce goes through Notion API's representation of the title and just concatenates
        // all the plain text versions of any segment in the Title object.
        //
        // More often than not, this will just be 1 single string, but we're accounting for all
        // possible cases here.
        // Look into whether this needs spaces between the title string components or not.
        firstDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    if (tapDeadlineEvents.firstDeadline.twoDays.length !== 0) {
      firstDeadlineSection += '\nTAP forms due 1 day from now\n';
      tapDeadlineEvents.firstDeadline.twoDays.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        firstDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    if (tapDeadlineEvents.firstDeadline.threeDays.length !== 0) {
      firstDeadlineSection += '\nTAP forms due 2 days from now\n';
      tapDeadlineEvents.firstDeadline.threeDays.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        firstDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    // Now for the 14-day deadline. Same thing, different section.
    if (tapDeadlineEvents.secondDeadline.oneDay.length !== 0) {
      secondDeadlineSection += '\n⚠️ **TAP forms due today!** ⚠️\n';
      tapDeadlineEvents.secondDeadline.oneDay.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        secondDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }
    
    if (tapDeadlineEvents.secondDeadline.twoDays.length !== 0) {
      secondDeadlineSection += '\nTAP forms due 1 day from now\n';
      tapDeadlineEvents.secondDeadline.twoDays.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        secondDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    if (tapDeadlineEvents.secondDeadline.threeDays.length !== 0) {
      secondDeadlineSection += '\nTAP forms due 2 days from now\n';
      tapDeadlineEvents.secondDeadline.threeDays.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        secondDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }
    
    // Set the final text of the embed. We want to check so as to not add random text
    // for empty sections and reduce the amount of clutter. We also add a newline after
    // the first deadline section in case of the new section as well.
    tapDeadlineEmbed.setDescription(
      (firstDeadlineSection !== '_21-day Deadline_\n' ? firstDeadlineSection + '\n' : '')
      + (secondDeadlineSection !== '_14-day Deadline_\n' ? secondDeadlineSection : ''));

    Logger.info('Sections built! Sending TAP deadline embed...');
    // Send the embed!
    await webhook.send({
      content: `<@&${config.logisticsTeamId}>`,
      embeds: [tapDeadlineEmbed],
    });
  }

  // Now for the Event Intake Forms. More or less the same code, but thankfully we only
  // need to add the 21-day deadline part, so no need for a lot more string building.
  if (!Object.values(eventIntakeEvents).every((array) => array.length === 0)) {
    Logger.info('Beginning CSI Intake deadline embed build...');
    eventIntakeDeadlineEmbed = new MessageEmbed()
      .setTitle('CSI Intake forms are due!')
      .setColor('YELLOW');

    let firstDeadlineSection = '_21-day Deadline_\n';
    if (eventIntakeEvents.oneDay.length !== 0) {
      firstDeadlineSection += '\n⚠️ **CSI Intake Forms due today!** ⚠️\n';
      eventIntakeEvents.oneDay.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        firstDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    if (eventIntakeEvents.twoDays.length !== 0) {
      firstDeadlineSection += '\nCSI Intake forms due 1 day from now\n';
      eventIntakeEvents.twoDays.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        firstDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    if (eventIntakeEvents.threeDays.length !== 0) {
      firstDeadlineSection += '\nCSI Intake forms due 2 days from now\n';
      eventIntakeEvents.threeDays.forEach((event) => {
        if (event.properties.Name.type !== 'title') {
          throw new Error('Event does not have Name field of type "title"');
        }
        firstDeadlineSection += `- [${
          event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
        }](${event.url})\n`;
      });
    }

    eventIntakeDeadlineEmbed.setDescription(
      firstDeadlineSection !== '_21-day Deadline_\n' ? firstDeadlineSection + '\n' : '');

    Logger.info('Sections built! Sending CSI Intake deadline embed...');
    // Send the embed!
    await webhook.send({
      content: `<@&${config.logisticsTeamId}>`,
      embeds: [eventIntakeDeadlineEmbed],
    });
  }
};

/**
 * Pings the Logistics Team to remind them to get keys for particular rooms that require them.
 * 
 * Every event in the Qualcomm Conference Room or in any CSE building room that is not CSE B225
 * ("The Fishbowl") requires keys.
 */
export const pingForKeys = async (notion: Client,
  webhook: WebhookClient,
  databaseId: string,
  config: EventNotionPipelineConfig) => {
  const tomorrow = DateTime.now().setZone('America/Los_Angeles').plus({ days: 1 });
  Logger.debug(`Querying Notion API for events on date ${tomorrow.toISODate()} in Qualcomm or CSE rooms...`);
  const eventsResponse = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'Date',
          date: {
            equals: tomorrow.toISODate(),
          },
        },
        {
          or: ['Qualcomm Room', 'CSE 1202', 'CSE 2154', 'CSE 4140'].map((location) => {
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

  const allEvents = eventsResponse.results.filter((event) => {
    if (event.properties.Type.type !== 'select') {
      throw new TypeError(`Event Type field for event not a SELECT! (Event URL: ${event.url}`);
    }
    return event.properties.Type.select.name !== 'CANCELLED';
  });

  // Check if there are any events to actually ping for.
  if (allEvents.length === 0) {
    Logger.info('No events to ping for! Skipping embed building...');
    return;
  }

  // Group the events depending on which location they're in. This way, we can build
  // the embed much easier later on.
  const eventsByLocation = groupBy(allEvents, (event) => {
    if (event.properties.Location.type !== 'select') {
      throw new TypeError(`Location field for event not a SELECT! (Event URL: ${event.url}`);
    }
    return event.properties.Location.select.name;
  });

  let keyPingDescription = '';

  // For each location, setup a header for the set of events that are in that location
  // and then list the names for each, along with the title, like the other pings
  // we send.
  Object.entries(eventsByLocation).forEach(([location, events]) => {
    keyPingDescription += `_${location} needs keys for these events:_\n`;
    events.forEach((event) => {
      if (event.properties.Name.type !== 'title') {
        throw new TypeError(`Title field for event not a title! (Event URL: ${event.url}`);
      }
      keyPingDescription += `- [${
        event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
      }](${event.url})\n`;
    });
    keyPingDescription += '\n';
  });

  // Now that we have all of them grouped up, we can build the embed.
  const keyPingEmbed = new MessageEmbed()
    .setTitle("Don't forget to pick up keys for rooms tomorrow!")
    .setColor('GREEN')
    .setDescription(keyPingDescription)
    .setFooter({ text: 'Note that the offices to pick up keys from close up at 4 PM!' });

  await webhook.send({
    content: `<@&${config.logisticsTeamId}>`,
    embeds: [keyPingEmbed],
  });

  Logger.info('Pinged for keys!');
};

/**
 * Pings the Finance Team for any upcoming events that need AS Funding forms submitted.
 * 
 * According to the Finance Team, AS Funding forms need to be submitted on the Friday 6 weeks before the event starts.
 */
export const pingForASFundingDeadlines = async (notion: Client,
  client: BotClient,
  databaseId: string,
  config: EventNotionPipelineConfig) => {
  // The week we need to look at for events that have that deadline.
  //
  // In reality, we'll have to query for the events in each day of the week,
  // so let's just get all those days in here.
  const allDaysToPingForWeek: DateTime[] = [];
  
  // We need to check whether we are in Week 9 of Spring. This is because in this case
  // we're interested in the events of next year. In that case look for next academic
  // year's Fall Quarter first 5 weeks.
  //
  // Week 9 of Spring is just 2 weeks before Finals Week, and all quarters end on exactly
  // Finals Week.
  const currentQuarter = getCurrentQuarter();
  const mondayThisWeek = DateTime.now().set({ weekday: 1 });
  if (currentQuarter === undefined) {
    throw new Error('Current time outside of saved academic calendars in ucsd-quarters-years!');
  }
  const isWeek9 = DateTime.fromJSDate(currentQuarter.end)
    .set({ weekday: 1 })
    .minus({ weeks: 2 })
    .hasSame(mondayThisWeek, 'day');
  if (currentQuarter.name.startsWith('SP') && isWeek9) {
    // Get the next Fall Quarter this year. This is very janky to query for, but alas.
    const nextYearFallQuarter = getQuarter('FA' + mondayThisWeek.year.toString().slice(-2) as keyof typeof quarters);

    // Get the range of 5 weeks of events we want to save.
    const startOf5Weeks = DateTime.fromJSDate(nextYearFallQuarter.start);
    const endOf5Weeks = startOf5Weeks.plus({ weeks: 5 }).set({ weekday: 7 });
    
    // Add each day to the array.
    for (let date = startOf5Weeks; !date.hasSame(endOf5Weeks, 'day'); date.plus({ days: 1 })) {
      allDaysToPingForWeek.push(date);
    }
  } else {
    // If not week 9 of Spring, just get the days from 6 weeks from now.
    const weekToPingForDeadline = DateTime.now().plus({ weeks: 6 }).set({ weekday: 1 });
    for (let i = 1; i <= 7; i++) {
      allDaysToPingForWeek.push(weekToPingForDeadline.set({ weekday: i }));
    } 
  } 

  // Query for all the events in the calendar from that week
  Logger.debug('Querying Notion API for events with AS Funding deadlines coming up...');
  const eventsResponse = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          or: allDaysToPingForWeek.map((day) => {
            return {
              property: 'Date',
              date: {
                equals: day.toISODate(),
              },
            };
          }),
        },
        {
          property: 'Funding Status',
          select: {
            equals: 'Funding TODO',
          },
        },
      ],
    },
  });

  const allEvents = eventsResponse.results.filter((event) => {
    if (event.properties.Type.type !== 'select') {
      throw new TypeError(`Event Type field for event not a SELECT! (Event URL: ${event.url}`);
    }
    return event.properties.Type.select.name !== 'CANCELLED';
  });

  Logger.debug(`Number of events with deadlines coming up: ${allEvents.length}`);

  // Check to see if we have no events to report. If we don't,
  // don't send any embeds and just return.
  if (allEvents.length === 0) {
    Logger.info('No events to ping for! Skipping embed building...');
    return;
  }

  // At this point, we know that all events have AS forms due on Friday. Therefore,
  // we just want to bunch them all up, and simply display those that don't have
  // funding done by Friday. Depending on the current day of the week, we want
  // to ping with different embed properties.
  const today = DateTime.now().setZone('America/Los_Angeles');
  let financePingEmbed = new MessageEmbed(); 
  // If Wednesday, we have another 2 days, we're good.
  if (today.weekday === 3) {
    financePingEmbed
      .setTitle('AS funding forms are due 2 days from now!')
      .setColor('BLUE');
  } else if (today.weekday === 4) {
    financePingEmbed
      .setTitle('AS funding forms are due 1 day from now!')
      .setColor('YELLOW');
  } else if (today.weekday === 5) {
    financePingEmbed
      .setTitle('⚠️ AS funding forms are due today! ⚠️')
      .setColor('RED');
  } else {
    return;
  }

  // Now to add the events to the description of the embed.
  // Just do the same as before.
  let financePingDescription = 'Here are all the events that need their forms done:\n';
  allEvents.forEach((event) => {
    if (event.properties.Name.type !== 'title') {
      throw new Error('Event does not have Name field of type "title"');
    }
    // Make a hyperlink with the title as the text and the Notion page URL as the link.
    // The reduce goes through Notion API's representation of the title and just concatenates
    // all the plain text versions of any segment in the Title object.
    //
    // More often than not, this will just be 1 single string, but we're accounting for all
    // possible cases here.
    // Look into whether this needs spaces between the title string components or not.
    financePingDescription += `- [${
      event.properties.Name.title.reduce((acc, curr) => acc + curr.plain_text, '')
    }](${event.url})\n`;
  });
  financePingEmbed.setDescription(financePingDescription);

  // Get the Finance channel and role.
  const financeChannel = client.channels.cache.get(config.client.settings.financeChannelID) as TextChannel;
  if (!financeChannel) {
    throw new Error(`Finance Channel not found with ID ${config.client.settings.financeChannelID}`);
  }
  await financeChannel.send({
    content: `<@&${config.client.settings.financeRoleID}>`,
    embeds: [financePingEmbed],
  });
};

/**
 * Pings for any deadlines and reminders that the Teams might need for any sort of event-related task.
 * 
 * This includes:
 * - TAP and CSI Event Intake Form deadlines
 * - Key reminders for Qualcomm and CSE rooms
 * - AS Funding deadline reminders
 *
 * @param config The config for the pipeline.
 */
export const pingForDeadlinesAndReminders = async (config: EventNotionPipelineConfig) => {
  Logger.info('Setting up TAP deadline pings...');
  Logger.debug('Getting API clients...');
  // The Notion API is easy enough to get.
  const notion = await getNotionAPI(config.notionToken);
  // Get the Discord webhook as well.
  const webhook = config.webhook;

  Logger.info('Getting Notion Calendar...');

  const databaseId = config.notionCalendarId;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  // Validate the Notion Calendar.
  Logger.debug('Validating schemas for data sources...');
  Logger.debug('Validating Notion database schema...');
  validateNotionDatabase(database);

  Logger.info('Pipeline ready! Running.');
  
  pingForTAPandCSIDeadlines(notion, webhook, databaseId, config);
  pingForKeys(notion, webhook, databaseId, config);
  pingForASFundingDeadlines(notion, config.client, databaseId, config);

  // Done!
  Logger.info('All reminders and deadlines pinged!');
};
