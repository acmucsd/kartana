import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import Logger from './utils/Logger';
import { notionCalSchema, googleSheetSchema } from './assets';
import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';
import { parse } from 'papaparse';
import { differenceWith, isEqual, uniq, without } from 'lodash';
import got from 'got';
import NotionEvent from './NotionEvent';
import { HostFormResponse } from './types';
import { exit } from 'process';

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
  const strippedHeaders = without(headers, '');
  if (!isEqual(strippedHeaders, googleSheetSchema)) {
    Logger.error('Google Sheets schema is mismatched! Halting!', {
      type: 'error',
      diff: differenceWith(googleSheetSchema, strippedHeaders, isEqual),
    });
    exit(1);
  }
};

/**
 * Gets a parsed version of the CSV download from the host form Google Sheet.
 * 
 * @returns A PapaParse object, where "data" contains a keyed set of objects for each
 * event and "meta" contains info about the CSV file itself.
 */
const getHostForm = async () => {
  const documentID = process.env.GOOGLE_SHEETS_DOC_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;
  const googleSheetURL = `https://docs.google.com/spreadsheets/d/${documentID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
  const googleSheetCSV = await got.get(googleSheetURL).text() as any;
  return parse(googleSheetCSV, {
    header: true,
  });
};

(async () => {
  Logger.info('Booting...');
  const notion = await getNotionAPI();
  Logger.info('Downloading Google Sheet...');
  const hostForm = await getHostForm();
  Logger.info('Getting Notion Calendar...');
  const databaseId = process.env.NOTION_CALENDAR_ID;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  Logger.debug('Validating schemas for data sources...');
  Logger.debug('Validating Notion database schema...');
  validateNotionDatabase(database);

  Logger.debug('Validating Google Sheets schema...');
  validateGoogleSheetsSchema(hostForm.meta.fields);

  Logger.info('Pipeline ready! Running.');
  Logger.info(`${hostForm.data.length} rows in Host Form CSV detected. Checking for new events...`);
  const newEvents: HostFormResponse[] = hostForm.data.filter((formResponse) =>
    formResponse['Imported to Notion'] === 'FALSE' && without(Object.values(formResponse), '', 'FALSE').length !== 0,
  ) as HostFormResponse[];
  Logger.info(`${newEvents.length} new events detected.`);
  Logger.info('Converting events...');
  const notionEventsToImport = newEvents.map((newEvent) => {
    return new NotionEvent(newEvent);
  });
  await Promise.all(notionEventsToImport.map(async (event) => {
    await event.uploadToNotion(notion);
  }));
  Logger.info('All events converted!');
})();
