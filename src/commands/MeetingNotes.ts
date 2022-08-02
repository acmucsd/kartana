import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { DateTime } from 'luxon';
import Command from '../Command';
import { BotClient } from '../types';

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
    const title = date.toLocaleString(DateTime.DATE_SHORT) + ' ' + interaction.options.getString('title', true);
    const url = await this.client.notionEventSyncManager.generateMeetingNotes(this.client, title, date);
    if (url) {
      // If the url isn't empty, the note was successfully made!
      const messageEmbed = new MessageEmbed()
        .setTitle('📝 Created a new meeting note!')
        .setURL(url)
        .setDescription(`**Title:** ${title}\n**Link:** ${url}`)
        .setColor('BLUE');
      super.edit(interaction, { embeds: [messageEmbed], ephemeral: false });
    } else {
      super.edit(interaction, { content: 'An error occurred when trying to generate a new note.', ephemeral: true });
    }
  }
}
