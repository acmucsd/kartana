import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message, MessageActionRow, MessageButton } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { isEmail } from 'validator';

/**
 * Pings the user.
 * Copied verbatim from BreadBot.
 *
 * Test Command left from the boilerplate.
 */
export default class Subscribe extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('subscribe')
      .addStringOption((option) =>
        option.setName('email').setDescription('Your @acmucsd.org or @ucsd.edu email address.').setRequired(true),
      )
      .addUserOption((option) => option.setName('user').setDescription('The user to subscribe to the email address.'))
      .setDescription(
        "Subscribes a user to receive meeting pings when they're an event attendee on an ACM GCal event!.",
      );

    super(
      client,
      {
        name: 'subscribe',
        enabled: true,
        description: "Subscribes a user to receive meeting pings when they're an event attendee on an ACM GCal event!.",
        category: 'Information',
        usage: client.settings.prefix.concat('subscribe'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition,
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);
    const meetingPingsSchema = this.client.googleCalendarManager.meetingPingsSchema;
    const email = interaction.options.getString('email', true);
    const userID = interaction.options.getUser('user')?.id || interaction.user.id;

    if (!isEmail(email) || (email.split('@')[1] !== 'acmucsd.org' && email.split('@')[1] !== 'ucsd.edu')) {
      await super.edit(interaction, 'Please enter a valid @acmucsd.org or @ucsd.edu email!');
    }
    const schemaStoredUserID = meetingPingsSchema.getGuest(email);
    if (schemaStoredUserID !== null) {
      if (schemaStoredUserID === userID) {
        await super.edit(
          interaction,
          `<@${schemaStoredUserID}> is already subscribed to calendar invites for **${email}**!`,
        );
      } else {
        const row = new MessageActionRow().addComponents(
          new MessageButton().setCustomId('Confirm').setLabel('Confirm').setStyle('PRIMARY'),
          new MessageButton().setCustomId('Cancel').setLabel('Cancel').setStyle('DANGER'),
        );
        const message = (await interaction.editReply({
          // eslint-disable-next-line max-len
          content: `<@${schemaStoredUserID}> is already subscribed to calendar invites for **${email}**!\nDo you want to update it to <@${userID}>?`,
          components: [row],
        })) as Message;

        let interactionCompleted = false;
        // The buttons listen to inputs for 20 seconds before the command expires.
        const collector = message.createMessageComponentCollector({ componentType: 'BUTTON', time: 20000 });
        collector.on('collect', async (buttonInteraction) => {
          if (buttonInteraction.user.id !== interaction.user.id) {
            // Only allow the original user to press the buttons.
            return;
          }
          if (buttonInteraction.customId === 'Cancel') {
            // The 'Cancel' button was pressed. We remove the buttons from being pressed.
            await super.edit(interaction, { content: '/subscribe was canceled!', components: [] });
            interactionCompleted = true;
            return;
          }
          // Otherwise, the 'Confirm' button was pressed.
          meetingPingsSchema.subscribeNewGuest(email, userID);
          await super.edit(interaction, {
            content: `<@${userID}> is now subscribed to calendar invites for **${email}**!`,
            components: [],
          });
          interactionCompleted = true;
        });

        // The max timeout (20 seconds) was reached. Let's remove the buttons so they can't be pressed.
        collector.on('end', async () => {
          if (!interactionCompleted)
            await super.edit(interaction, { content: 'The call to /subscribe expired!', components: [] });
        });
      }
    } else {
      meetingPingsSchema.subscribeNewGuest(email, userID);
      await super.edit(interaction, `<@${userID}> is now subscribed to calendar invites for **${email}**!`);
    }
  }
}
