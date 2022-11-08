import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed, TextChannel } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { DateTime } from 'luxon';
import Logger from '../utils/Logger';

/**
 * This command will send a scheduled message after waiting
 * for a user specified time.
 * 
 * 
 * The command will first create a calendar event with details 
 * necessary for sending the event (see Google Calendar Manager).
 * It then schedules a message using a cronjob.
 * Currently there is a 1000 hour limit on scheduled messages.
 */
export default class ScheduleSend extends Command {
  
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('schedulesend')
      .addStringOption((option) => option.setName('message')
        .setDescription('Message to be sent')
        .setRequired(true))
      .addStringOption((option) => option.setName('wait')
        .setDescription('Time to wait before sending message. Use hh:mm format!')
        .setRequired(true))
      .setDescription('Sends a scheduled message to the channel');

 
    super(client, {
      name: 'schedulesend',
      boardRequired: true,
      enabled: true,
      description: 'Sends a scheduled message to the channel',
      category: 'Utility',
      usage: client.settings.prefix.concat('schedulesend'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }
  
  public async run(interaction: CommandInteraction): Promise<void> {
    /**
     * Pull the user input values from the command
     */
    const message = interaction.options.getString('message', true);
    const member = interaction.member;
    const wait = interaction.options.getString('wait', true);

    // Checking if the time is valid
    const timeValidation = new RegExp('^[0-9]+:[0-5][0-9]$');
    if (!timeValidation.test(wait)){
      super.respond(interaction, 
        { content: 'Invalid wait time! Use hours:minutes formatting (e.g. 4:04)', ephemeral: true });
      return; 
    }

    /**
     * Pulling the numbers out of the string since we've guaranteed the formatting of the string
     */
    const timeArray = wait.split(':'); 
    const hoursFromNow = Number(timeArray[0]);
    const minutesFromNow = Number(timeArray[1]);

    // Gets the current time
    const date = DateTime.now();
  
    // Message to be sent
    const messageToSend = `**Scheduled Message from ${member}:** \n>>> ${message}`;

    // Special case when there is no wait time: we send the message without scheduling anything
    if (hoursFromNow == 0 && minutesFromNow == 0 && interaction.channel !== null) {
      super.respond(interaction, { 
        content: `Message received! I'll send it at <t:${Math.trunc(date.toSeconds())}:F>`, 
        ephemeral: true, 
      });
      await interaction.channel.send(messageToSend); 
      return;
    }

    // Cap wait time, strange behavior occurs if time overflows and becomes NaN
    if (hoursFromNow > 1000) {
      super.respond(interaction, {
        content: 'Exceeded maximum wait time! I won\'t wait longer than 1000 hours to send a message.',
        ephemeral: true,
      });
      return;
    }

    // Creates date object with time to send
    const dateToSend = date.plus({ hours: hoursFromNow, minutes: minutesFromNow });

    // If it passes all above edge cases then reply...
    await super.respond(interaction, {
      content: `Message received! I'll send it at <t:${Math.trunc(dateToSend.toSeconds())}:F>`,
      ephemeral: true,
    });
    
    /**
     * Checks to make sure the interaction channel exists
     * Necessary for accessing channel ID value in following channels 
     */
    if (interaction.channel === null) {
      Logger.error('Channel for scheduled message no longer exists.');
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error with ScheduleSend!')
        .setDescription('Error sending scheduled message: Channel no longer exists!')
        .setColor('DARK_RED');
      const channel = this.client.channels.cache.get(this.client.settings.botErrorChannelID) as TextChannel;
      channel.send({
        content: `*Paging <@&${this.client.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
      return;
    }

    // Add Message to the google calendar
    this.client.googleCalendarManager.addScheduledMessage(this.client, interaction.channelId,
      messageToSend, dateToSend);

    // Schedule the message to be sent
    this.client.googleCalendarManager.scheduleMessage(this.client, dateToSend, messageToSend, interaction.channelId);

  }
}