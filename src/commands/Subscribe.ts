import { CommandInteraction, Message, MessageActionRow, MessageButton, SlashCommandBuilder } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

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
        option.setName('email').setDescription('Your @acmucsd.org email address.').setRequired(true)
      )
      .setDescription('Pings the bot.');

    super(
      client,
      {
        name: 'subscribe',
        enabled: true,
        description: 'Pings the bot.',
        category: 'Information',
        usage: client.settings.prefix.concat('subscribe'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);
    const meetingPingsSchema = this.client.googleCalendarManager.meetingPingsSchema;
    const email = interaction.options.getString('email', true);
    const userID = interaction.user.id;

    const schemaStoredUserID = meetingPingsSchema.getGuest(email);
    if (schemaStoredUserID !== null) {
      if (schemaStoredUserID === userID) {
        await super.edit(interaction, `**${email}** is already subscribed to <@${schemaStoredUserID}>!`);
      } else {
        const row = new MessageActionRow().addComponents(
          new MessageButton().setCustomId('Confirm').setLabel('Confirm').setStyle('PRIMARY'),
          new MessageButton().setCustomId('Cancel').setLabel('Cancel').setStyle('DANGER')
        );
        const message = (await interaction.editReply({
          // eslint-disable-next-line max-len
          content: `**${email}** is currently subscribed to <@${schemaStoredUserID}>! Do you want to update it to <@${userID}>?`,
          components: [row],
        })) as Message;

        // The buttons listen to inputs for 20 seconds before the command expires.
        message
          .awaitMessageComponent({ componentType: 'BUTTON', time: 20000 })
          .then(async (buttonInteraction) => {
            if (buttonInteraction.customId === 'Cancel') {
              // The 'Cancel' button was pressed. We remove the buttons from being pressed.
              await super.edit(interaction, { content: '/subscribe was canceled!', components: [] });
              return;
            }
            // Otherwise, the 'Confirm' button was pressed.
            meetingPingsSchema.subscribeNewGuest(email, userID);
            await super.edit(interaction, {
              content: `Successfully subscribed **${email}** to ping <@${userID}>!`,
              components: [],
            });
          })
          .catch(async () => {
            // The max timeout (20 seconds) was reached. Let's remove the buttons so they can't be pressed.
            await super.edit(interaction, { content: 'The call to /subscribe expired!', components: [] });
          });
      }
    } else {
      meetingPingsSchema.subscribeNewGuest(email, userID);
      await super.edit(interaction, `Successfully subscribed **${email}** to ping <@${userID}>!`);
    }
  }
}
