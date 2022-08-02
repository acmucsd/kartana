import { Client } from '@notionhq/client/build/src';
import { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints';
import { DateTime } from 'luxon';
import { toNotionRichText } from '../event-notion/NotionEvent';
import Logger from '../utils/Logger';

/**
 * NotionNote is a representation of an note stored in Notion Meeting Notes.
 * 
 * NotionNote is based off of NotionEvent's representation of events on the Board Notion Calendar.
 * Most fields aren't present right now because we'll only be tracking the title and date to make blank pages.
 * This could change in the future.
 * 
 * The class is completely type-safe, meaning that ANY note that does not dispense a TypeError
 * upon construction can be safely used with the Notion API or any other without causing
 * inconsistencies in what Notion or other API's may store.
 */
export default class NotionNote {
  // The ID for the location where the Notion Note should exist in.
  private parentNotesId: string;
  
  /**
   * Set the parent meeting notes ID.
   */
  public setNotesId(id: string): void {
    this.parentNotesId = id;
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
   * Uploads this note to Notion.
   * 
   * This operation simply creates a page on Notion Meeting Notes.
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
        database_id: this.parentNotesId,
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
      },
    };
  
    // Upload the event to Notion's API. If this errors out, we'll need to
    // send a message to Discord paging me about the issue.
    //
    // For now, just throw the error.
    const response = await client.pages.create(createPagePayload);
    Logger.debug(`Page ${response.id} created for meeting note "${this.name}"`);
    return response.url;
  }
}