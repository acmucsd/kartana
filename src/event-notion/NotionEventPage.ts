import { Client } from '@notionhq/client/build/src';
import { CreatePageParameters, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { DateTime } from 'luxon';
import { toNotionRichText } from '../event-notion/NotionCalEvent';
import Logger from '../utils/Logger';
import { notionHostedEventDescription } from '../assets';

/**
 * NotionEventPage is a representation of an page stored in Notion Hosted Events.
 * This contains event tracking information and planning details.
 *
 * NotionEventPage is based off of NotionEvent's representation of events on the Board Notion Calendar.
 * Most fields aren't present right now because we'll only be tracking the title and date to make blank pages.
 * This could change in the future.
 *
 * The class is completely type-safe, meaning that ANY note that does not dispense a TypeError
 * upon construction can be safely used with the Notion API or any other without causing
 * inconsistencies in what Notion or other API's may store.
 */
export default class NotionEventPage {
  // The ID for the Hosted Events database, where all event pages are stored.
  private databaseID: string;

  // Set the database ID.
  public setDatabaseID(id: string): void {
    this.databaseID = id;
  }

  // The ID for the calendarEvent where the Notion page should be linked to.
  private calendarEventID: string;

  /**
   * Set the calendarEvent link.
   */
  public setCalendarEventID(id: string): void {
    this.calendarEventID = id;
  }

  // The name of the Note. (the Title of the Notion Page)
  private name: string;

  // The date of the Note.
  private date: DateTime;

  /**
   * Gets the title of this Note.
   * @returns The name of this Note.
   */
  public getName(): string {
    return this.name;
  }

  constructor(name: string, date: DateTime) {
    this.name = name;
    this.date = date;
  }

  /**
   * Uploads this event page to Notion.
   *
   * This operation simply creates a page on Notion Hosted Events.
   * It will not keep track of it once it is created. This uses the Notion API
   * to submit.
   *
   * This is done by taking the properties of the event and converting
   * them into the properties payload the Notion API requests for. See
   * the API documentation for details of each property's type and contents.
   *
   * @see https://developers.notion.com/reference/post-page
   * @see https://developers.notion.com/reference/page#all-property-values
   * @returns the URL of the created Page for the event.
   */
  public async uploadToNotion(client: Client): Promise<string> {
    const createPagePayload: CreatePageParameters = {
      parent: {
        database_id: this.databaseID,
      },
      properties: {
        Name: {
          title: toNotionRichText(this.name),
        },
        Date: {
          date: {
            start: this.date.toISODate(),
          },
        },
        'Calendar Event': {
          relation: [{ id: this.calendarEventID }],
        },
      },
      children: notionHostedEventDescription,
    };

    Logger.debug(createPagePayload);
    // Upload the event to Notion's API. If this errors out, we'll need to
    // send a message to Discord paging me about the issue.
    //
    // For now, just throw the error.
    const response = (await client.pages.create(createPagePayload)) as PageObjectResponse;
    Logger.debug(`Page ${response.id} created for hosted event page "${this.name}"`);
    return response.url;
  }
}
