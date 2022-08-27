import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { DateTime } from 'luxon';
import schedule from 'node-schedule';
import { v4 as newUUID } from 'uuid';
import Logger from '../utils/Logger';

/**
 * This command will send a scheduled message after waiting
 * for a user specified time.
 * 
 * 
 * The command will run a cronjob to send the message. Currently
 * there is a 1 day limit on scheduled messages but that will likely
 * change soon.
 */
export default class ScheduledSend extends Command {
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
     * User input values
     */
    const message = interaction.options.getString('message', true);
    const member = interaction.member;
    const wait = interaction.options.getString('wait', true);

    /**
     * Arrays to help check whether time values are valid
     * and to configure Date object
     */
    const timeArray = wait.split(':'); 

    //Checks if the timestring is valid
    //If there exists a timestring
    if (!wait) {
      super.respond(interaction, 
        { content: 'Wait time must be given as a parameter'
          , ephemeral: true });
      return;
    }
    const time = DateTime.fromFormat(wait, 'hh:mm');
    if (!time.isValid){
      super.respond(interaction, 
        { content: 'Invalid wait! Use hh:mm formatting (e.g. 04:04)'
          , ephemeral: true });
      return; 
    }

    //Gets the current time
    const date = DateTime.now();

    //Creates date object with time to send
    const dateToSend = date.plus({ hours: Number(timeArray[0]), minutes: Number(timeArray[1]), seconds: 3 });
    
    const messageReceived = `Message Received! I will send it at <t:${Math.trunc(dateToSend.toSeconds())}:F>`;
    //If it passes all above edge cases then reply...
    await super.respond(interaction, {
      content: messageReceived,
      ephemeral: true,
    });

  
    //Message to be sent
    const messageToSend = `**Scheduled Message from ${member}:** \n>>> ${message}`;

    //Schedules cronJob 
    schedule.scheduleJob(dateToSend.toJSDate(), async () => {
      //Notfies that job has been scheduled
      Logger.info('Message to be sent scheduled}');
      
      /**
      * Checks if the channel is still there or if it
      * got deleted before the job could be executed
      */
      if (interaction.channel === null) {
        const uuid = newUUID();
        Logger.error('Channel is null', {
          eventType: 'commandError',
          command: 'scheduled',
          uuid,
        });
        await super.respond(interaction, {
          content: `An error was encountered when finding the channel you sent this message in. 
          I know, it's weird. *(Error UUID: ${uuid})`,
          ephemeral: true,
        });
        return;
      }
      
      //Sends the message to the channel
      await interaction.channel.send(messageToSend); 
    });

  }
}