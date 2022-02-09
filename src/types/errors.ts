/**
 * This error should be thrown if ever the Notion calendar's
 * schema does not match what we have saved.
 */
export class NotionSchemaMismatchError extends Error {
  public diff: Object;
  
  /**
   * Constructs the error.
   * @param diff The difference between our own schema and the Notion calendar schema as returned by Lodash.
   */
  constructor(diff: Object) {
    super();

    Object.setPrototypeOf(this, NotionSchemaMismatchError.prototype);
    this.diff = diff;
  }
}

/**
 * This error should be thrown if ever the Google Sheets table's
 * schema does not match what we have saved.
 */
export class GoogleSheetsSchemaMismatchError extends Error {
  diff: Object;

  /**
   * Constructs the error.
   * @param diff The difference between our own schema and the Google sheets schema as returned by Lodash.
   */
  constructor(diff: Object) {
    super();

    Object.setPrototypeOf(this, GoogleSheetsSchemaMismatchError.prototype);
    this.diff = diff;
  }
}