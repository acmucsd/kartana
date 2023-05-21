import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message, MessageActionRow, MessageButton } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { DateTime } from 'luxon';

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
      .addStringOption((option) => option.setName('message').setDescription('Message to be sent').setRequired(true))
      .addStringOption((option) =>
        option
          .setName('wait')
          .setDescription('Time to wait before sending message. Use hh:mm format!')
          .setRequired(true),
      )
      .setDescription('Sends a scheduled message to the channel');

    super(
      client,
      {
        name: 'schedulesend',
        boardRequired: true,
        enabled: true,
        description: 'Sends a scheduled message to the channel',
        category: 'Utility',
        usage: client.settings.prefix.concat('schedulesend'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition,
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);
    /**
     * Pull the user input values from the command
     */
    const message = interaction.options.getString('message', true);
    const member = interaction.member;
    const wait = interaction.options.getString('wait', true);

    // Checking if the time is valid
    const timeValidation = new RegExp('^[0-9]+:[0-5][0-9]$');
    if (!timeValidation.test(wait)) {
      super.edit(interaction, {
        content: 'Invalid wait time! Use hours:minutes formatting (e.g. 4:04)',
        ephemeral: true,
      });
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

    // Cap wait time, strange behavior occurs if time overflows and becomes NaN
    if (hoursFromNow > 1000) {
      super.edit(interaction, {
        content: "Exceeded maximum wait time! I won't wait longer than 1000 hours to send a message.",
        ephemeral: true,
      });
      return;
    }

    // Setting up the confirmation buttons...
    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('Schedule Message').setLabel('Schedule Message').setStyle('PRIMARY'),
      new MessageButton().setCustomId('Cancel').setLabel('Cancel').setStyle('DANGER'),
    );

    // Creates date object with time to send
    const dateToSend = date.plus({ hours: hoursFromNow, minutes: minutesFromNow });

    // If it passes all above edge cases then reply...
    const confirmationMessage = (await interaction.editReply({
      content:
        `**Should I schedule this message for** <t:${Math.trunc(dateToSend.toSeconds())}:F>?` + `\n>>> ${message}`,
      components: [row],
    })) as Message;

    const collector = confirmationMessage.createMessageComponentCollector({ componentType: 'BUTTON', time: 20000 });

    let interactionCompleted = false;
    collector.on('collect', async (buttonInteraction) => {
      interactionCompleted = true;
      if (buttonInteraction.customId === 'Cancel') {
        // The 'Cancel' button was pressed. We remove the buttons from being pressed again.
        await super.edit(interaction, { content: '**/schedulesend** was canceled!', components: [] });
        return;
      }

      // Otherwise, the schedule send was confirmed.

      await super.edit(interaction, {
        content: `**Done! I'll send this message at** <t:${Math.trunc(dateToSend.toSeconds())}:F>:\n>>> ${message}`,
        components: [],
      });

      // Special case when there is no wait time: we send the message without scheduling anything
      if (hoursFromNow == 0 && minutesFromNow == 0 && interaction.channel !== null) {
        await interaction.channel.send(messageToSend);
        return;
      }

      // Add message to the Google Calendar for persistence (i.e. the bot goes down).
      this.client.googleCalendarManager.addScheduledMessage(
        this.client,
        interaction.channelId,
        messageToSend,
        dateToSend,
      );

      // Schedule the message to be sent
      this.client.googleCalendarManager.scheduleMessage(this.client, dateToSend, messageToSend, interaction.channelId);
    });

    collector.on('end', async () => {
      if (!interactionCompleted) {
        await super.edit(interaction, { content: '**/schedulesend** expired!', components: [] });
      }
    });
  }
}
