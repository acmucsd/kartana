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
   * ACMURL credentials.
   */
  acmurl: {
    username: string;
    password: string;
  }
  /**
   * API Keys for various services.
   */
  apiKeys: {
    catAPI?: string;
    unsplash?: string;
  }
  
  /**
   * Membership Portal API admin account credentials.
   */
  portalAPI: {
    username: string;
    password: string;
  }
  
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
   * ID of maintainer of bot.
   *
   * Used for funny easter eggs with regards to the maintainer, such as BreadBot's
   * trademark disobedience of its master.
   */
  maintainerID?: string;
  /**
   * The Discord API bot token. Needed to authenticate the bot.
   */
  token: string;
  prefix: string;
  paths: {
    commands: string;
    events: string;
  };
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