export * from './meetingPingsSchema';

/**
 * DiscordInfo is a representation of the Discord channel info that each Google Calendar maps to.
 */
export class DiscordInfo {
  // The ID of the channel to send notifications to (typically an 18-digit number) 
  private channelID: string;

  // The ID of the person/role to mention in the notification (typically an 18-digit number)
  private mentions: string;

  /**
   * Gets the ID of the channel to send notifications to.
   * @returns ID of the channel.
   */
  public getChannelID(): string {
    return this.channelID;
  }

  /**
   * Gets the ID of the person/role to mention in the notification.
   * @returns ID of the person/role.
   */
  public getMentions(): string {
    // Note: The ampersand is specific to mentioning roles, not users.
    return `<@&${this.mentions}>`;
  }

  constructor(channelID: string, mentions: string) {
    this.channelID = channelID;
    this.mentions = mentions;
  }
}