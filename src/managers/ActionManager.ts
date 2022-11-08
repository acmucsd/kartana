import { Collection } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Service } from 'typedi';
import { join } from 'path';
import { readdir, statSync } from 'fs';
import { Routes } from 'discord-api-types/v9';
import { BotClient } from '../types';
import Command from '../Command';
import Logger from '../utils/Logger';

/**
 * ActionManager dynamically managed all of the respective Commands and Events
 * to be loaded into the Client.
 *
 * This is done by dynamically importing all the commands and the events saved
 * in the directories marked within the Client configuration and adding them in their
 * respective locations.
 *
 * This allows for automatic registering of any correct commands in the codebase,
 * provided their files are saved in the proper directories.
 */
@Service()
export default class {
  public commands: Collection<string, Command> = new Collection<string, Command>();

  /**
   * Parses files into commands from the configured command path.
   * @param {BotClient} client The original client, for access to the configuration.
   * @returns {Collection<string, Command>} A dictionary of every command in a [name, object] pair
   */
  public initializeCommands(client: BotClient): void {
    // Get our commands directory from the settings.
    const { commands } = client.settings.paths;

    // Instantiate an array to hold all the information necessary to register Slash Commands
    // on Discord's API. Due to how finnicky Discord's API is, this has to be untyped.
    const slashCommands: any[] = [];

    // Go through every file in that directory.
    readdir(commands, (err, files) => {
      if (err) Logger.error(err);

      // For every Command file...
      files.forEach(async (cmd) => {
        // Check if it is a directory, because if it is...
        if (statSync(join(commands, cmd)).isDirectory()) {
          // Recursively deal with that, since we may want to split commands by module
          // folder in the future.
          this.initializeCommands(client);
        } else {
          // Import our Command file.
          const commandImport = await import(join(
            __dirname,
            '../../',
            `${commands}/${cmd.replace('ts', 'js')}`,
          ));

          // Get the default export.
          const LoadedCommand = commandImport.default;
          // Construct the Command.
          const command: Command = new LoadedCommand(client);

          // If Command enabled, load it in our Client.
          // Also add to Slash Command registration payload.
          if (command.conf.enabled && command.definition !== undefined) {
            this.commands.set(command.conf.name, command);
            slashCommands.push(command.definition.toJSON());
          }
        }
      });

      // Now we upload the Slash Command registration payload to Discord.
      const restAPI = new REST({ version: '9' }).setToken(client.settings.token);

      (async () => {
        Logger.info('Loading Slash Commands on Discord Gateway...', {
          eventType: 'slashCommandLoading',
        });
        await restAPI.put(
          Routes.applicationCommands(client.settings.clientID),
          { body: slashCommands }, 
        );
        // Adding the ID for our Discord Guild allows new slash commands to load faster than adding it globally.
        await restAPI.put(
          Routes.applicationGuildCommands(client.settings.clientID, client.settings.discordGuildID),
          { body: slashCommands },
        );
        Logger.info('Loaded Slash Commands on Discord Gateway!', {
          eventType: 'slashCommandLoaded',
        });
      })();
    });
  }

  /**
   * Initializes every event from the configured event path.
   * @param {BotClient} client The original client, for access to the configuration.
   */
  public static initializeEvents(client: BotClient): void {
    // Get our events directory from the settings.
    const { events } = client.settings.paths;

    // Go through every file in that directory.
    readdir(events, (err, files) => {
      if (err) Logger.error(err);

      // For every Event file...
      files.forEach(async (evt) => {
        // Import our Event file.
        const eventImport = await import(join(
          __dirname,
          '../../',
          `${events}/${evt.replace('ts', 'js')}`,
        ));

        // Get the default export.
        const LoadedEvent = eventImport.default;
        // Construct the Event class.
        const event = new LoadedEvent(client);

        // Get the name of the event from Discord.js.
        const eventName = evt.split('.')[0];

        // Initialize the event in Discord.js.
        // We lowercase the first letter, since that's how events are written down in Discord.js,
        // and use the abstract `run` method we implemented in the file as the callback for our
        // event.
        client.on(
          eventName.charAt(0).toLowerCase() + eventName.slice(1),
          (...args: string[]) => event.run(...args),
        );
      });
    });
  }
}
