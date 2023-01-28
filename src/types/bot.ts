import {
  Client,
  TextChannel,
  DMChannel,
  PermissionString,
  PresenceData,
  ClientOptions,
  Collection,
  NewsChannel,
  MessagePayload,
  InteractionReplyOptions,
} from 'discord.js';
import Command from '../Command';
import GoogleCalendarManager from '../managers/GoogleCalendarManager';
import NotionEventSyncManager from '../managers/NotionEventSyncManager';
  
/**
 * The options for a Command.
 * Copied verbatim from BreadBot.
 *
 * Each command has specific flags and parameters used by the Client to understand execution.
 */
export interface CommandOptions {
  /**
   * The name of the Command. This translates to what will be used to call the Command.
   */
  name: string;
  /**
   * Whether the Command is enabled or not.
   *
   * If disabled, the Command will never be registered by the Client.
   * This option can only be modified before starting the Client.
   */
  enabled: boolean;
  /**
   * Whether the "Board" role is required when running this Command.
   *
   * If required, any user without the role running the command will be warned they are
   * unable to. The incident will be logged as well.
   */
  boardRequired?: boolean;
  /**
   * A brief description of what the Command does.
   */
  description?: string;
  /**
   * Example usage of the Command.
   *
   * "[argument]" represents an optional argument.
   * "<argument>" represents a mandatory argument.
   *
   * @example "!command <somethingWeNeed> [someExtraArgument]"
   */
  usage?: string;
  
  /**
   * Category of the command.
   *
   * Ideally, we'd split the Help message in the future via Category,
   * but there are too few Commands right now.
   */
  category?: string;
  
  /**
   * Required permissions to run the Command.
   *
   * Essentially, permissions that the calling user needs to have in order to run the Command.
   * Ideally, the bot should only do things that a User could feasably do with the
   * given permissions in the case that the bot didn't exist.
   */
  requiredPermissions: PermissionString[];
}
  
/**
 * The configuration for the Bot.
 *
 * This includes environment variables that are required, or nice extras.
 */
export interface BotSettings {
  /**
   * Presence data for bot. This displays cool Rich presence for the bot, if given.
   */
  presence: PresenceData;
  /**
   * Discord.js-specific Client options. Currently unused.
   */
  clientOptions?: ClientOptions;
  
  /**
   * Client ID of the application that BreadBot is made in.
   *
   * This has to be obtained from the Discord Developers Portal.
   */
  clientID: string;
  /**
   * The Discord API bot token. Needed to authenticate the bot.
   */
  token: string;
  prefix: string;
  paths: {
    commands: string;
    events: string;
  };
  /**
   * The credentials required for the Notion Integration
   * connected to the ACM UCSD Board Notion.
   * 
   * This Integration needs read-write access to the Notion Calendar
   * in order for the Event Notion Pipeline to function properly.
   */
  notionIntegrationToken: string;
  notionCalendarID: string;
  notionMeetingNotesID: string;
  /**
   * The credentials for the GCS service account with access to the
   * Host Form Response Google Sheet.
   * 
   * The first should link to the email, but the second environment variable
   * should be a relative path to the JSON file acquired from GCS for the
   * service account.
   */
  googleSheetsServiceAccountEmail: string;
  googleSheetsKeyFile: string;
  /**
   * The information required to access the Host Form Response Google Sheet.
   * 
   * The ID can be extracted from the first part of the Google Sheet URL, and the
   * sheet name MUST be a verbatim copy of the sheet from the Google Sheet that
   * contains all the response.
   */
  googleSheetsDocID: string;
  googleSheetsSheetName: string;
  /**
   * Discord Guild (server) ID to speed up porting of new slash commands.
   */
  discordGuildID: string;
  /**
   * Channel ID to send any alerts the Notion Event pipeline makes.
   */
  discordEventPipelineChannelID: string;
  /**
   * Discord mention ID's for Logistics team and maintainer of pipelines.
   */
  maintainerID: string;
  logisticsTeamID: string;
  /**
   * Discord channel ID where Google Calendar bot error messages will be sent.
   */
  botErrorChannelID: string;
  /**
   * Scheduled Message Calendar ID, used for backing up scheduled messages.
   */
  scheduledMessageGoogleCalendarID: string;

  /** 
   * ACMURL credentials. Used in the /meetingnotes command 
   */
  acmurl: {
    username: string,
    password: string,
  }
}
  
/**
 * Interface for BreadBot's dependency-injected Client.
 *
 * Contains a few additional parameters for our own usage in other Commands.
 */
export interface BotClient extends Client {
  /**
   * Our client's settings.
   */
  settings: BotSettings;
  
  /**
   * Map of Commands registered by name in order for quick retrieval of parameters
   * for other commands, like Help.
   */
  commands: Collection<string, Command>;

  /**
   * Flags for Kartana to run properly.
   */
  flags: {
    validNotionSchema: boolean,
    validGoogleSchema: boolean,
  }

  notionEventSyncManager: NotionEventSyncManager;
  googleCalendarManager: GoogleCalendarManager;
}
  
/**
 * A Client Event the bot will react to, returned by "Discord.js"
 * All of these must be events that "Discord.js" can accept callbacks for.
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Client Discord.js documentation}
 */
export interface BotEvent {
  /**
   * The callback method for the Event to be passed to "Discord.js".
   *
   * @param args The arguments passed in by the Discord.js Client.
   */
  run(args?: any): void;
}
  
/**
 * UUIDv4 string. Useful for the 'uuid' package to understand difference in code.
 */
export type UUIDv4 = string;
  
/**
 * Any kind of channel we can send text to.
 */
export type AnyChannel = TextChannel | DMChannel | NewsChannel;
  
/**
 * Wrapper type for Commands to be able to return proper Message responses.
 */
export type InteractionPayload = string | MessagePayload | InteractionReplyOptions;