import { Client } from '@notionhq/client';
import Logger from '../utils/Logger';
import { notionCalSchema, googleSheetSchema } from '../assets';
import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';
import { differenceWith, isEqual, without } from 'lodash';
import NotionEvent from './NotionEvent';
import { HostFormResponse } from '../types';
import { exit } from 'process';
import { GoogleSpreadsheet, GoogleSpreadsheetRow, ServiceAccountCredentials } from 'google-spreadsheet';
import { MessageEmbed, WebhookClient } from 'discord.js';

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
  const databaseDiff = diff(database.properties, notionCalSchema);
  if (databaseDiff.length !== 0) {
    Logger.error('Notion Calendar schema is mismatched! Halting!', {
      type: 'error',
      diff: databaseDiff, 
    });
    exit(1);
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
    Logger.error('Google Sheets schema is mismatched! Halting!', {
      type: 'error',
      diff: differenceWith(googleSheetSchema, headers, isEqual),
    });
    exit(1);
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
  webhookURL: string;
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
 * This function is basically the main function of the pipeline right now, but this will be replaced
 * with a call from a web microservice soon.
 */
export const syncHostFormToNotionCalendar = async (config: EventNotionPipelineConfig) => {
  Logger.info('Syncing Host Form to Notion Calendar...');
  Logger.debug('Getting API clients...');
  // The Notion API is easy enough to get.
  const notion = await getNotionAPI(config.notionToken);

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

  // We need to get access to our Discord webhook as well.
  // Get it from configs and just make a webhook client.
  const webhook = new WebhookClient({ url: config.webhookURL });

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
    && without(Object.values(formResponse), '', 'FALSE').length !== 0) {
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
      return new NotionEvent(newEvent);
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
        content: `*Paging <@&${config.logisticsTeamId}> and <@${config.maintainerId}>!*`,
        embeds: [errorEmbed],
      });
      return [];
    }
  });

  // Then take all our events that we've converted and not only
  // upload them to notion, but ALSO make sure the Google spreadsheet
  // has the checkbox ticked if there were no errors with the import.
  await Promise.all(notionEventsToImport.map(async (event, index) => {
    // Upload to Notion.
    try {
      const url = await event.uploadToNotion(notion);
      // Report that we've successfully imported the event on Discord.
      const successEmbed = new MessageEmbed()
        .setTitle('📥 Imported new event!')
        .setDescription(`**Event name:** ${event.getName()}\n**URL:** ${url}`)
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
        content: `*Paging <@&${config.logisticsTeamId}> and <@${config.maintainerId}>!*`,
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