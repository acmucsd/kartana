# Credentials & Integrations

The Notion Events pipeline requires bot accounts made for Google Sheets' and Notion's API
to properly allow access to our Host Form and Notion Calendar.

## GCS Service Account

To have read-write access to the Host Form Response Google Sheet, we need a GCS Service Account
that has access to the sheet. In order to do this, you'll need to:

1. Open a GCS account (`dev@acmucsd.org` has one)
2. Go to the Google Developers Console
3. Select an existing project or create a new one (and then select it)
4. Enable the Sheets API for the above project
5. Create a service account for the project
  a. In the sidebar on the left, select "APIs & Services > Credentials"
  b. Click the blue `+ CREATE CREDENTIALS` button and select the `Service account` option
  c. Enter name, description, and click `CREATE`
  d. You can skip permissions and click `CONTINUE`
  e. Click the `+ CREATE KEY` button
  f. Select the `JSON` key type option for exporting credentials
  g. Click the `Create` button
  h. Your browser will download the credentials JSON file. **BE CAREFUL! THIS IS THE ONLY COPY YOU'RE GETTING!**
  i. click `DONE`
6. Find the service account's email address (available in the JSON key file you downloaded)
7. Share the Host Form Response doc with your service account using the email from step 6
8. Add the service account email and path to the above JSON file in the `.env` file (use `.env.example` as reference)

## Notion Integration

To have read-write access to the Notion Calendar, we need to make a Notion Integration and
give it access to the Notion Calendar database.

Thankfully, the Notion API reference is vastly more human-friendly than the Google Sheets API, and
even has some nicely-written documentation.

Follow [Step 1](https://developers.notion.com/docs/getting-started#step-1-create-an-integration) and
[Step 2](https://developers.notion.com/docs/getting-started#step-2-share-a-database-with-your-integration) of
the Notion API reference. As for a couple of details that are important:

- The Integration should be an Internal one with access to the "ACM UCSD" Notion workspace
- Put the Internal Integration Token and ID in the `.env` file (use `.env.example` as reference)