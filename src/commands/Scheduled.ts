import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { DateTime } from 'luxon';
import schedule from 'node-schedule';
import { v4 as newUUID } from 'uuid';
import Logger from '../utils/Logger';

/**
 * This command allows users to send scheduled messsages
 * 
 * Runs a cronjob based on the time the user wants the message
 * to be sent. Currently operates on 12hr time. Note it will 
 * send messages based on the timezone of the machine running
 * Kartana. 
 */
export default class Scheduled extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('scheduled')
      .addUserOption((option) => option.setName('user')
        .setDescription('users to be added')
        .setRequired(true))
      .addStringOption((option) => option.setName('message')
        .setDescription('message to be sent')
        .setRequired(true))
      .addStringOption((option) => option.setName('date')
        .setDescription('enter date in mm/dd/yyyy format')
        .setRequired(true))
      .addStringOption((option) => option.setName('time')
        .setDescription('enter time in hh:mm format')
        .setRequired(true))
      .addStringOption((option) => option.setName('shift')
        .setDescription('specify either am or pm')
        .setRequired(true))
      .setDescription('sends a scheduled message');

 
    super(client, {
      name: 'scheduled',
      boardRequired: true,
      enabled: true,
      description: 'sends a scheduled message',
      category: 'Utility',
      usage: client.settings.prefix.concat('scheduled'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }
  
  public async run(interaction: CommandInteraction): Promise<void> {
    
    /**
     * We will defer the interaction...
     */
    await super.defer(interaction);

    /**
     * User input values
     */
    const message = interaction.options.getString('message', true);
    const user = interaction.options.getUser('user', true); 
    const member = interaction.member;
    const datestring = interaction.options.getString('date', true);
    const timestring = interaction.options.getString('time', true);
    const shift = interaction.options.getString('shift', true);
    
    /**
     * Array to check whether user specifies am/pm
     */
    const shifts = ['am', 'pm'];

    /**
     * Arrays to help check whether time values are valid
     * and to configure cronjob
     */
    let timeArray = timestring.split(':'); 
    let dateArray = datestring.split('/');

    // Date checker copied from meeting notes command
    // If there is a datestring...
    if (datestring) {
      let date = DateTime.fromFormat(datestring, 'MM/dd/yyyy');
      //If the date is not valid and does not have format 'MM/dd/yyyy'
      if (!date.isValid) {
        super.edit(interaction, 
          { content: 'Invalid date! Use MM/DD/YYYY formatting (e.g. 08/01/2022)', ephemeral: true });
        return;
      }
    }

    //Checks if the timestring is valid
    //If there exists a timestring
    if (timestring) {
      let time = DateTime.fromFormat(timestring, 'hh:mm');
      //If time does not follow 'hh:mm' format or hour > 12 or minute >= 60
      //Since we are in 12hr time 
      if (!time.isValid || Number(timeArray[0]) > 12 || Number(timeArray[1]) >= 60){
        super.edit(interaction, 
          { content: 'Invalid time! Use hh:mm formatting (e.g. 04:04), hr must be from 1-12 & min must be from 0-59'
            , ephemeral: true });
        return; 
      }
    }

    //Checks whether the shift is valid
    //If there exists a shift
    if (shift) {
      //If the shift is not included in the shifts array
      if (!shifts.includes(shift)) {
        super.edit(interaction, 
          { content: 'Invalid shift! Type am or pm'
            , ephemeral: true });
        return;  
      } 
    }
    
    //If it passes all above edge cases say...
    await super.edit(interaction, {
      content: 'Message Received!',
      ephemeral: true,
    });

    //Creates messsage to send
    const messageToSend = `From: ${member} To: ${user}, ${message}`;
    
    //Gets the minute
    let minute = Number(timeArray[1]);
    
    /**
     * Converts hour into 24hr time
     */
    let hour = 0;
    if (shift === 'am' && Number(timeArray[0]) !== 12) {
      hour = Number(timeArray[0]);
    }
    if (shift === 'pm') {
      hour = Number(timeArray[0]) !== 12 ? Number(timeArray[0]) + 12 : 12;
    }
    
    //Gets the month and day
    let month = Number(dateArray[0]);
    let day = Number(dateArray[1]);


    //Schedules cronJob 
    schedule.scheduleJob(`0 ${minute} ${hour} ${day} ${month} *`, async () => {
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