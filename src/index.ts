import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import Logger from './utils/Logger';
import { notionCalSchema, googleSheetSchema } from './assets';
import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';
import { google, sheets_v4 } from 'googleapis';


config();

// Notion Client Login
const getNotionAPI = async () => {
  return new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
};

// Google Sheets Client Login
const getGoogleSheetsAPI = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SHEETS_KEY_FILE,
    scopes: 'https://www.googleapis.com/auth/spreadsheets', 
  });
  const authClientObject = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: authClientObject });
  return googleSheets;
};
/**
 * Make sure that the current assigned database has a proper schema for us
 * to run the sync script on.
 * 
 * This function is run before any modifications to the database are made.
 */
const validateNotionDatabase = (database: GetDatabaseResponse) => {
  const databaseDiff = diff(database.properties, notionCalSchema);
  if (databaseDiff.length !== 0) {
    Logger.error('Notion Calendar schema is mismatched! Halting!', {
      type: 'error',
      diff: databaseDiff, 
    });
  }
};

const validateGoogleSheet = async (api: sheets_v4.Sheets, sheetID: string) => {
  const response = await api.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: '1:1',
  });

  const databaseDiff = diff(response.data.values, googleSheetSchema);
  if (databaseDiff.length !== 0) {
    Logger.error('Google Sheet schema is mismatched! Halting!', {
      type: 'error',
      diff: databaseDiff, 
    });
  }
};

(async () => {
  Logger.info('Booting...');
  const notion = await getNotionAPI();
  const googleSheetsAPI = await getGoogleSheetsAPI();
  Logger.debug('Validating schemas for data sources...');
  const databaseId = process.env.NOTION_CALENDAR_ID;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  Logger.debug('Validating Notion database schema.');
  validateNotionDatabase(database);

  Logger.debug('Validating Google Sheets schema...');
  validateGoogleSheet(googleSheetsAPI, process.env.GOOGLE_SHEET_ID);

  Logger.info('Pipeline ready!');
})();
