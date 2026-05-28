import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { DateTime } from 'luxon';
import { ACMURLConfig, addACMURL, handleExistingACMURL } from '../acmurl';
import Command from '../Command';
import { BotClient, UUIDv4 } from '../types';
import { v4 as newUUID } from 'uuid';
import Logger from '../utils/Logger';

/**
 * Makes a new meeting note on Notion and provides a link to it.
 */
export default class MeetingNotes extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('meetingnotes')
      .addStringOption((option) => option.setName('title')
        .setDescription('Meeting note title (e.g. "Board Meeting"). Dates are automatically added to the title!')
        .setRequired(true))
      .addStringOption((option) => option.setName('date')
        .setDescription('MM/DD/YYYY (Defaults to today\'s date)'))
      .addStringOption((option) => option.setName('shortlink')
        .setDescription('Shortens the link to acmurl.com/{shortlink}!'))
      .setDescription('Makes a new meeting note on Notion with the given title and links to it.');

    super(client, {
      name: 'meetingnotes',
      boardRequired: true,
      enabled: true,
      description: 'Makes a new meeting note on Notion with the given title and links to it.',
      category: 'Utility',
      usage: client.settings.prefix.concat('meetingnotes'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  /**
   * Shortens the given long link into acmurl.com/{shortlink}.
   * @param interaction The command interaction from the called command, so we can edit it in the event of an error.
   * @param shortlink The shortened ID to shorten the link to (acmurl.com/{shortlink})
   * @param longlink The long link to shorten (here, a link to the Notion meeting notes)
   * @returns The new shortened link, or null in the event of an error.
   */
  private async makeACMURL(
    interaction: CommandInteraction, shortlink: string, longlink: string,
  ): Promise<string | null> {
    const linkTitle = `Discord Bot: ${shortlink}`;
    const config: ACMURLConfig = {
      username: this.client.settings.acmurl.username,
      password: this.client.settings.acmurl.password,
    };
    try {
      const shortURL = await addACMURL(shortlink, longlink, linkTitle, config);
      return shortURL;
    } catch (e) {
      // We might error out if an ACMURL already exists with the provided shortlink.
      // We'll attempt to handle that by updating the ACMURL.
      const errorUUID: UUIDv4 = newUUID();

      const error = e as any;

      // If the error we get is specifically that a ACMURL already existed.
      if (error.message === 'error:keyword') {
        try {
          // Make a new one and return the old long link and new ACMURL
          const [, newURL] = await handleExistingACMURL(
            shortlink, longlink, linkTitle, config,
          );
          return newURL;
        } catch (e2) {
          const updateError = e2 as any;
          // If by any chance there's an error when updating the ACMURL, log it and return.
          Logger.error(`Error whilst updating short URL on YOURLS API: ${updateError.message}`, {
            eventType: 'interfaceError',
            interface: 'YOURLS',
            error: updateError,
            uuid: errorUUID,
          });
          await super.edit(interaction, 
            `An error occurred when attempting to update the short URL. *(Error UUID: ${errorUUID})*`,
          );
          return null;
        }
      } else {
        // If the error we had initially when adding the ACMURL is any other error,
        // log it and return.
        Logger.error(`Error whilst creating short URL on YOURLS API: ${error.message}`, {
          eventType: 'interfaceError',
          interface: 'YOURLS',
          error,
          uuid: errorUUID,
        });
        await super.edit(interaction, `An error occurred when shortening the URL. *(Error UUID: ${errorUUID})*`);
        return null;
      }
    }
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);
    let date = DateTime.now();

    /** 
     * We're going to try to parse the date out of the argument.
     * If a date wasn't provided, we default to today's date.
     */
    const dateString = interaction.options.getString('date');
    if (dateString) {
      date = DateTime.fromFormat(dateString, 'MM/dd/yyyy');
      if (!date.isValid) {
        super.edit(interaction, 
          { content: 'Invalid date! Use MM/DD/YYYY formatting (e.g. 08/01/2022)', ephemeral: true });
        return;
      }
    }
    
    // We automatically add the date of the note to the start of the title.
    const title = date.toFormat('MM/dd/yyyy') + ' ' + interaction.options.getString('title', true);
    let url = await this.client.notionEventSyncManager.generateMeetingNotes(this.client, title, date);
    const shortlink = interaction.options.getString('shortlink', false);
    if (url) {
      // If the url isn't empty, the note was successfully made!
      let embedDescription = `**Title:** ${title}\n**Link:** ${url}`;
      
      if (shortlink) {
        // A shortlink was provided, so we'll shorten the url here.
        const shortURL = await this.makeACMURL(interaction, shortlink, url);
        if (shortURL) {
          embedDescription += `\n**Shortened Link:** ${shortURL}`;
        }
      }
      let messageEmbed = new MessageEmbed()
        .setTitle('📝 Created a new meeting note!')
        .setURL(url)
        .setDescription(embedDescription)
        .setColor('BLUE');
      super.edit(interaction, { embeds: [messageEmbed], ephemeral: false });
    } else {
      super.edit(interaction, { content: 'An error occurred when trying to generate a new note.', ephemeral: true });
    }
  }
}
