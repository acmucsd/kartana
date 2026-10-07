const dotenv = require('dotenv');

dotenv.config();

(async () => {
  console.log('Saving properties of prod calendar in file...');
  const notion = require('@notionhq/client');
  const client = new notion.Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
  const database_info = await client.databases.retrieve({ database_id: process.env.NOTION_CALENDAR_ID });
  const database_props = await database_info.properties;
  console.log('Done querying! Saving to file...');
  require('fs').writeFileSync('notion.properties', JSON.stringify(database_props, null, 2));
  console.log('Done!');
})();

(async () => {
  console.log('Saving sorted headers of form responses sheet in file...');
  const { google } = require('googleapis');

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SHEETS_KEY_FILE),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Row 1 of a Form responses sheet holds the question titles
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_DOC_ID,
    range: `${process.env.GOOGLE_SHEETS_SHEET_NAME || 'Form Responses 1'}!1:1`,
  });

  const headers = (res.data.values?.[0] || []).filter(Boolean);
  const sorted = [...headers].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  console.log('Done querying! Saving to file...');
  require('fs').writeFileSync('sheet.properties', JSON.stringify(sorted, null, 2));
  console.log('Done!');
})();
