import { DateTime } from 'luxon';
import { getNotionAPI } from '../event-notion';
import NotionNote from './NotionNote';

export interface NotesNotionPipelineConfig {
  noteTitle: string;
  noteDate: DateTime;
  notionNotesId: string;
  notionToken: string;
}

/**
 * Makes a new note in the Board Notion Meeting Notes database and returns the url to the note.
 * @param config Important configuration variables.
 * @returns The url to the newly generated note.
 */
export const generateNewNote = async (config: NotesNotionPipelineConfig): Promise<string> => {
  // First, we log into Notion and get the API.
  const notion = await getNotionAPI(config.notionToken);

  // Next, we pull the database containing the meeting notes.
  const databaseId = config.notionNotesId;

  /**
   * We won't validate the meeting notes for now since we essentially
   * only make a blank page with a title for the meeting note.
   * TODO: Consider tracking the database schema for more involved page-making that requires other fields.
   */
  // const database = await notion.databases.retrieve({ database_id: databaseId });

  // Convert our note to a NotionNote to simplify importing it to Notion.
  const note = new NotionNote(config.noteTitle, config.noteDate);
  note.setNotesId(databaseId);

  const url = await note.uploadToNotion(notion);
  return url;
};