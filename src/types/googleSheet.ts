import { googleSheetSchema } from '../assets';

/**
 * A response to the Host Form, extracted from a row of its corresponding
 * Google Sheet.
 * 
 * This effectively matches the columns from the Google Spreadsheet.
 */
export type HostFormResponse = {
  [K in typeof googleSheetSchema[number]]: string;
};