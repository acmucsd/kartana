const dotenv = require('dotenv');

dotenv.config();

(async () => {
    console.log('Saving properties of prod calendar in file...');
    const notion = require('@notionhq/client');
    const client = new notion.Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
    const database_info = await client.databases.retrieve({ database_id: process.env.NOTION_CALENDAR_ID })
    const database_props = await database_info.properties;
    console.log('Done querying! Saving to file...');
    require('fs').writeFileSync('database.properties', JSON.stringify(database_props, null, 2));
    console.log('Done!');
})()