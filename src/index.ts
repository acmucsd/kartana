import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import Logger from './utils/Logger';
import { notionCalSchema, googleSheetSchema } from './assets';
import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';
import { differenceWith, isEqual, without } from 'lodash';
import NotionEvent from './NotionEvent';
import { HostFormResponse } from './types';
import { exit } from 'process';
import { readFileSync } from 'fs';
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';

config();

/**
 * Logs into Notion.
 * 
 * @returns The Notion Client object.
 */
const getNotionAPI = async () => {
  return new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
};

/**
 * Make sure that the current assigned Notion database has a proper schema for us
 * to run the sync script on.
 * 
 * This function should be run before any modifications to the database are made.
 * @param database The Notion Database we are running modifications on.
 */
const validateNotionDatabase = (database: GetDatabaseResponse) => {
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
 * This should be run before any other modifications to the Notion database are made.
 * @param headers The headers from the Google Sheet CSV download of the host form.
 */
const validateGoogleSheetsSchema = (headers) => {
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
 * We do this by iterating over our header values and getting each value from that, thus turning it
 * into our interface for Host Form responses.
 * 
 * @param headers the headers of our Host Form.
 * @param row The Google Spreadsheet row from the Host Form.
 */
const toHostFormResponse = (headers: string[], row: GoogleSpreadsheetRow): HostFormResponse => {
  const hostFormResponse = {};
  headers.forEach((header) => {
    hostFormResponse[header] = row[header];
  });
  return hostFormResponse as HostFormResponse;
};

/**
 * Gets a parsed version of the CSV download from the host form Google Sheet.
 * 
 * @returns A PapaParse object, where "data" contains a keyed set of objects for each
 * event and "meta" contains info about the CSV file itself.
 */
const getHostForm = async (hostFormDoc: GoogleSpreadsheet) => {
  await hostFormDoc.loadInfo();
  const sheet = hostFormDoc.sheetsByTitle[process.env.GOOGLE_SHEETS_SHEET_NAME];
  const rows = await sheet.getRows();
  // Save the form headers, but remove everything else
  const headers = sheet.headerValues;
  // return the parts of the sheet separately, for easier management later
  return {
    headers,
    rows,
    data: rows.map((row) => toHostFormResponse(headers, row)),
  };
};

(async () => {
  Logger.info('Booting...');
  Logger.debug('Getting API clients...');
  const notion = await getNotionAPI();
  const hostFormDoc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_DOC_ID);
  const googleSheetServiceAccountFile = readFileSync(process.env.GOOGLE_SHEETS_KEY_FILE);
  const googleSheetAPICredentials = JSON.parse(googleSheetServiceAccountFile.toString());
  await hostFormDoc.useServiceAccountAuth(googleSheetAPICredentials);
  Logger.info('Downloading Google Sheet data...');
  const hostForm = await getHostForm(hostFormDoc);
  Logger.info('Getting Notion Calendar...');
  const databaseId = process.env.NOTION_CALENDAR_ID;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  Logger.debug('Validating schemas for data sources...');
  Logger.debug('Validating Notion database schema...');
  validateNotionDatabase(database);

  Logger.debug('Validating Google Sheets schema...');
  validateGoogleSheetsSchema(hostForm.headers);

  Logger.info('Pipeline ready! Running.');
  Logger.info(`${hostForm.data.length} rows in Host Form CSV detected. Checking for new events...`);
  const newEventRows: GoogleSpreadsheetRow[] = [];
  const newEvents: HostFormResponse[] = hostForm.data.filter((formResponse, index) => {
    if (formResponse['Imported to Notion'] === 'FALSE'
    && without(Object.values(formResponse), '', 'FALSE').length !== 0) {
      newEventRows.push(hostForm.rows[index]);
      return true;
    } else {
      return false;
    }
  },
  ) as HostFormResponse[];
  Logger.info(`${newEvents.length} new events detected.`);
  if (newEvents.length === 0) {
    Logger.info('No events to convert! Done!');
    return;
  }
  Logger.info('Converting events...');
  const notionEventsToImport = newEvents.map((newEvent) => {
    return new NotionEvent(newEvent);
  });
  await Promise.all(notionEventsToImport.map(async (event, index) => {
    await event.uploadToNotion(notion);
    const eventRow = newEventRows[index];
    eventRow['Imported to Notion'] = 'TRUE';
    await eventRow.save();
  }));
  Logger.info('All events converted!');
})();
