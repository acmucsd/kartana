let dotenv = require('dotenv');

dotenv.config();

(async () => {
    console.log('Saving properties of prod calendar in file...');
    const notion = require('@notionhq/client');
    const client = new notion.Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
    const database_props = await (await client.databases.retrieve({ database_id: process.env.NOTION_CALENDAR_ID })).properties;
    console.log('Done querying! Saving to file...');
    require('fs').writeFileSync('database.properties', JSON.stringify(database_props, 2));
    console.log('Done!');
})()