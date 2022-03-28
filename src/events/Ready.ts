import Logger from '../utils/Logger';
import { BotClient, BotEvent } from '../types';

/**
 * The Ready event is triggered when the bot is fully connected to the Discord API.
 *
 * This event is only emitted once, so we'll just log that we've been initialized and add any
 * one-off tasks we need before we take any other events.
 */
export default class Ready implements BotEvent {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  /**
   * Run the initialization warning for this event.
   */
  public async run(): Promise<void> {
    // If we're finally logged in...
    if (this.client.user) {
      // ...log that we're up! This marks log beginnings as well.
      Logger.info(`${this.client.user.username} now ready!`, {
        eventType: 'ready',
      });
      // Set our Rich Presence data.
      await this.client.user.setPresence(this.client.settings.presence);
    }
  }
}