import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import { ACMPosition, ACMTeam, POSITION_CHOICES, TEAM_CHOICES } from '../types/acm';

/**
 * Assigns the user the corresponding Discord roles based on position and team.
 */
export default class Assign extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('assign')
      .addUserOption((option) => option.setName('user').setDescription('The user to assign roles to').setRequired(true))
      .addStringOption((option) => {
        option.setName('team').setDescription('The team the user belongs to').setRequired(true);
        option.addChoices(TEAM_CHOICES.map((op) => [op, op]));
        return option;
      })
      .addStringOption((option) => {
        option.setName('position').setDescription('The position/role the user holds').setRequired(true);
        option.addChoices(POSITION_CHOICES.map((op) => [op, op]));
        return option;
      })
      .setDescription('Assigns Discord roles based on user team and position.');

    super(
      client,
      {
        name: 'assign',
        boardRequired: true,
        execRequired: true,
        enabled: true,
        description: 'Assigns the user roles based on their team and position.',
        category: 'Utility',
        usage: client.settings.prefix.concat('assign'),
        requiredPermissions: ['MANAGE_ROLES', 'SEND_MESSAGES'],
      },
      definition,
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);

    const targetUser = interaction.options.getUser('user', true);
    const team = interaction.options.getString('team', true);
    const position = interaction.options.getString('position', true);

    if (!TEAM_CHOICES.includes(team as ACMTeam)) {
      await super.edit(interaction, { content: 'Invalid team provided.', ephemeral: true });
      return;
    }
    if (!POSITION_CHOICES.includes(position as ACMPosition)) {
      await super.edit(interaction, { content: 'Invalid position provided.', ephemeral: true });
      return;
    }

    let member: GuildMember;
    try {
      member = await interaction.guild!.members.fetch(targetUser.id);
    } catch (e) {
      await super.edit(interaction, { content: 'Could not find that user in this server.', ephemeral: true });
      return;
    }

    const success = await this.client.discordRoleManager.assignRoles(
      this.client,
      member,
      team as ACMTeam,
      position as ACMPosition,
    );

    if (success) {
      await super.edit(interaction, { content: 'Roles successfully applied!', ephemeral: true });
    } else {
      await super.edit(interaction, {
        content: 'Failed to apply roles, check the target user manually!',
        ephemeral: true,
      });
    }
  }
}
