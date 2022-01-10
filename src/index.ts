import { syncHostFormToNotionCalendar } from './event-notion';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import express from 'express';
import Logger from './utils/Logger';

config();

const app = express();
const googleSheetKeyFile = readFileSync(process.env.GOOGLE_SHEETS_KEY_FILE);

app.get('/ping', (_, res) => {
  res.send('Pong!');
});

app.post('/notion/events/sync', async (_, res) => {
  await syncHostFormToNotionCalendar({
    hostFormSheetId: process.env.GOOGLE_SHEETS_DOC_ID,
    hostFormSheetName: process.env.GOOGLE_SHEETS_SHEET_NAME,
    notionCalendarId: process.env.NOTION_CALENDAR_ID,
    notionToken: process.env.NOTION_INTEGRATION_TOKEN,
    webhookURL: process.env.DISCORD_WEBHOOK_URL,
    googleSheetAPICredentials: JSON.parse(googleSheetKeyFile.toString()),
  });
  res.send('Manual sync run!');
});

Logger.info('Ready. Listening on port 8080!');
app.listen(8080, 'localhost');