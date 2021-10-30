import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import Logger from './utils/Logger';
import { notionCalSchema } from './assets';
import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { diff } from 'json-diff-ts';

config();

const notion = new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });

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

(async () => {
  Logger.info('Pipeline ready!');
  const databaseId = process.env.NOTION_CALENDAR_ID;
  const database = await notion.databases.retrieve({ database_id: databaseId });

  Logger.debug('Validating Notion database schema.');
  validateNotionDatabase(database);

  

})();
