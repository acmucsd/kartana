import { Collection, Client as DiscordClient } from 'discord.js';
import { Service } from 'typedi';
import Logger from './utils/Logger';
import { BotSettings, BotClient, BotInitializationError } from './types';
import Command from './Command';
import ActionManager from './managers/ActionManager';
import NotionEventSyncManager from './managers/NotionEventSyncManager';
import configuration from './config/config';
import GoogleCalendarManager from './managers/GoogleCalendarManager';

/**
 * The class representing the Discord bot.
 * Copied verbatim from BreadBot, with PortalAPIManager replaced with NotionEventSyncManager.
 *
 * Our Client class not only holds the client itself, but also implements additional
 * parameters to keep track of bot settings and registered Events and Commands.
 *
 * The procedure when initializing the Client goes something like this:
 * - Pass in any required ClientOptions for Discord.js, if any.
 * - Take default configuration from "config.ts" and pass through to our Client,
 *   adding environment variables found. If any required environment variables don't exist,
 *   we error out.
 * - Initialize our ActionManager, our method of dynamically importing Events and Commands
 * - Initialize our NotionEventSyncManager, our pipeline to automatically sync Notion Events
 * with the Events Host Form
 * - Login to Discord API when done initializing everything.
 *
 * ActionManager does the heavy lifting, so read that as well.
 */
@Service()
export default class Client extends DiscordClient implements BotClient {
  /**
   * The settings for the Client.
   *
   * These are a mix of environment variables and default Discord.js client options.
   */
  public settings: BotSettings;

  /**
   * Flags for Kartana to run properly.
   */
  public flags = {
    validNotionSchema: true,
    validGoogleSchema: true,
  };

  /**
   * The default constructor for Client.
   *
   * Begins the configuration process. Initialization is done in {@link initialize initialize()}.
   * @param actionManager An ActionManager class to run. Injected by TypeDI.
   * @param notionEventSyncManager A NotionEventSyncManager class to run. Injected by TypeDI.
   * @param googleCalendarManager A GoogleCalendarManager class to run. Injected by TypeDI.
   */
  constructor(
    private actionManager: ActionManager,
    public notionEventSyncManager: NotionEventSyncManager,
    public googleCalendarManager: GoogleCalendarManager,
  ) {
    super(
      configuration.clientOptions || {
        intents: [
          'GUILDS',
          'GUILD_INTEGRATIONS',
          'GUILD_WEBHOOKS',
          'GUILD_MESSAGES',
          'DIRECT_MESSAGES',
          'GUILD_MESSAGE_REACTIONS',
          'DIRECT_MESSAGE_REACTIONS',
        ],
      },
    );
    this.settings = configuration;
    // We absolutely need some envvars, so if they're not in our .env file, nuke the initialization.
    // We can throw Errors here to nuke the bot, since we don't have any catches higher up.
    if (!process.env.BOT_TOKEN) {
      throw new BotInitializationError('bot token');
    }
    if (!process.env.BOT_PREFIX) {
      throw new BotInitializationError('bot prefix');
    }
    if (!process.env.CLIENT_ID) {
      throw new BotInitializationError('app client ID');
    }
    if (!process.env.NOTION_INTEGRATION_TOKEN) {
      throw new BotInitializationError('Notion Integration Token');
    }
    if (!process.env.NOTION_CALENDAR_ID) {
      throw new BotInitializationError('Notion Calendar ID');
    }
    if (!process.env.NOTION_MEETING_NOTES_ID) {
      throw new BotInitializationError('Notion Meeting Notes ID');
    }
    if (!process.env.NOTION_HOSTED_EVENTS_ID) {
      throw new BotInitializationError('Notion Hosted Events ID');
    }
    if (!process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL) {
      throw new BotInitializationError('Google Sheets Service Account Email');
    }
    if (!process.env.GOOGLE_SHEETS_KEY_FILE) {
      throw new BotInitializationError('Google Sheets Key File');
    }
    if (!process.env.GOOGLE_SHEETS_DOC_ID) {
      throw new BotInitializationError('Google Sheets Doc ID');
    }
    if (!process.env.GOOGLE_SHEETS_SHEET_NAME) {
      throw new BotInitializationError('Google Sheets Sheet Name');
    }
    if (!process.env.DISCORD_GUILD_ID) {
      throw new BotInitializationError('Discord Guild ID');
    }
    if (!process.env.DISCORD_EVENT_PIPELINE_CHANNEL_ID) {
      throw new BotInitializationError('Discord Event Pipeline Channel ID');
    }
    if (!process.env.DISCORD_MAINTAINER_MENTION_ID) {
      throw new BotInitializationError('Discord Maintainer Mention ID');
    }
    if (!process.env.DISCORD_LOGISTICS_TEAM_MENTION_ID) {
      throw new BotInitializationError('Discord Logistics Team Mention ID');
    }
    if (!process.env.DISCORD_FUNDING_TEAM_MENTION_ID) {
      throw new BotInitializationError('Discord Funding Team Mention ID');
    }
    if (!process.env.DISCORD_MARKETING_TEAM_MENTION_ID) {
      throw new BotInitializationError('Discord Marketing Team Mention ID');
    }
    if (!process.env.DISCORD_BOT_ERROR_CHANNEL_ID) {
      throw new BotInitializationError('Discord Bot Error Channel ID');
    }
    if (!process.env.SCHEDULED_MESSAGE_GOOGLE_CALENDAR_ID) {
      throw new BotInitializationError('Scheduled Message Google Calendar ID');
    }
    if (!process.env.ACMURL_USERNAME) {
      throw new BotInitializationError('ACMURL username');
    }
    if (!process.env.ACMURL_PASSWORD) {
      throw new BotInitializationError('ACMURL password');
    }

    this.settings.clientID = process.env.CLIENT_ID;
    this.settings.token = process.env.BOT_TOKEN;
    this.settings.prefix = process.env.BOT_PREFIX;
    this.settings.notionIntegrationToken = process.env.NOTION_INTEGRATION_TOKEN;
    this.settings.notionCalendarID = process.env.NOTION_CALENDAR_ID;
    this.settings.notionMeetingNotesID = process.env.NOTION_MEETING_NOTES_ID;
    this.settings.notionHostedEventsID = process.env.NOTION_HOSTED_EVENTS_ID;
    this.settings.googleSheetsServiceAccountEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
    this.settings.googleSheetsKeyFile = process.env.GOOGLE_SHEETS_KEY_FILE;
    this.settings.googleSheetsDocID = process.env.GOOGLE_SHEETS_DOC_ID;
    this.settings.googleSheetsSheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;
    this.settings.discordGuildID = process.env.DISCORD_GUILD_ID;
    this.settings.discordEventPipelineChannelID = process.env.DISCORD_EVENT_PIPELINE_CHANNEL_ID;
    this.settings.maintainerID = process.env.DISCORD_MAINTAINER_MENTION_ID;
    this.settings.logisticsTeamID = process.env.DISCORD_LOGISTICS_TEAM_MENTION_ID;
    this.settings.fundingTeamID = process.env.DISCORD_FUNDING_TEAM_MENTION_ID;
    this.settings.marketingTeamID = process.env.DISCORD_MARKETING_TEAM_MENTION_ID;
    this.settings.botErrorChannelID = process.env.DISCORD_BOT_ERROR_CHANNEL_ID;
    this.settings.scheduledMessageGoogleCalendarID = process.env.SCHEDULED_MESSAGE_GOOGLE_CALENDAR_ID;
    this.settings.acmurl.username = process.env.ACMURL_USERNAME;
    this.settings.acmurl.password = process.env.ACMURL_PASSWORD;
    this.initialize().then();
  }

  /**
   * Initialize the Client and connect to the Discord API.
   *
   * Registers all Events and Commands and then logs in to the API for being ready.
   * Highly recommend to read ActionManager's code to understand what this does.
   * @private
   */
  private async initialize(): Promise<void> {
    try {
      this.actionManager.initializeCommands(this);
      ActionManager.initializeEvents(this);
      this.notionEventSyncManager.initializeNotionSync(this);
      await this.googleCalendarManager.initializeMeetingPings(this);
      await this.googleCalendarManager.initializeScheduledMessages(this);
      await this.login(configuration.token);
    } catch (e) {
      Logger.error(`Could not initialize bot: ${e}`);
    }
  }

  /**
   * Get a map of [commandName, Command] pairs.
   *
   * Useful to find a registered Command quickly.
   */
  public get commands(): Collection<string, Command> {
    return this.actionManager.commands;
  }
}
