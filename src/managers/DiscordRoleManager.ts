import { Service } from 'typedi';
import { GuildMember, MessageEmbed, TextChannel } from 'discord.js';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { ACMCommunity, ACMPosition, ACMTeam } from '../types/acm';
import { DiscordRole, ROLE_CHOICES } from '../types/discordRoles';

function resolveRoleIds(member: GuildMember, roleNames: string[]): { ids: string[]; missing: string[] } {
  const ids: string[] = [];
  const missing: string[] = [];
  for (const name of roleNames) {
    const role = member.guild.roles.cache.find((r) => r.name === name);
    if (role) ids.push(role.id);
    else missing.push(name);
  }
  return { ids, missing };
}

/**
 * RoleManager handles building and assigning the correct set of Discord roles to a member
 * based on team/position
 */
@Service()
export default class {
  /**
   * Builds the array of role names to assign based on team and position.
   * @param team The team string provided by the command invoker.
   * @param position The role/position string provided by the command invoker.
   * @returns An array of role names to add to the member.
   */
  private buildRoleList(team: ACMTeam, position: ACMPosition): string[] {
    const rolesToAssign: string[] = [];

    const community: ACMCommunity =
      team == ACMTeam.AI
        ? ACMCommunity.AI
        : team == ACMTeam.Hack
          ? ACMCommunity.Hack
          : team == ACMTeam.Cyber
            ? ACMCommunity.Cyber
            : ACMCommunity.General;

    const assignByPosition: Record<ACMPosition, () => DiscordRole[]> = {
      [ACMPosition.President]: () => {
        return [DiscordRole.Board, DiscordRole.Executive, DiscordRole.President];
      },
      [ACMPosition.VP]: () => {
        return community == ACMCommunity.General
          ? [DiscordRole.Board, DiscordRole.Executive]
          : [DiscordRole.Board, DiscordRole.Executive, DiscordRole.CommunityExec];
      },
      [ACMPosition.Board]: () => {
        return community == ACMCommunity.General ? [DiscordRole.Board, DiscordRole.GeneralBoard] : [DiscordRole.Board];
      },
      [ACMPosition.Staff]: () => {
        return [DiscordRole.Staff];
      },
      [ACMPosition.MAL]: () => {
        return [DiscordRole.MembersAtLarge];
      },
      [ACMPosition.Member]: () => {
        return [];
      },
      [ACMPosition.Applicant]: () => {
        return [];
      },
    };

    const assignByTeam: Record<ACMTeam, () => DiscordRole[]> = {
      [ACMTeam.AI]: () => {
        return [DiscordRole.AI];
      },
      [ACMTeam.Cyber]: () => {
        return [DiscordRole.Cyber];
      },
      [ACMTeam.Development]: () => {
        return [DiscordRole.Development];
      },
      [ACMTeam.Events]: () => {
        return [DiscordRole.Events];
      },
      [ACMTeam.External]: () => {
        return [DiscordRole.External];
      },
      [ACMTeam.Finance]: () => {
        return [DiscordRole.Finance];
      },
      [ACMTeam.Hack]: () => {
        return [DiscordRole.Hack];
      },
      [ACMTeam.Hackathon]: () => {
        return [DiscordRole.Hackathon];
      },
      [ACMTeam.Membership]: () => {
        return [DiscordRole.Membership];
      },
      [ACMTeam.Outreach]: () => {
        return [DiscordRole.Outreach];
      },
      [ACMTeam.Projects]: () => {
        return [DiscordRole.Projects];
      },
      [ACMTeam.None]: () => {
        return [];
      },
    };

    rolesToAssign.push(...assignByPosition[position]());
    rolesToAssign.push(...assignByTeam[team]());
    rolesToAssign.push(DiscordRole.Member);

    return rolesToAssign;
  }

  /**
   * Assigns the appropriate roles to the given member based on team and position,
   * logging the outcome and returning a result object for the caller to use in feedback.
   *
   * Only "managed" roles (those in ROLE_CHOICES) are ever touched. Any other role
   * the member holds (e.g. self-assigned color roles, event roles, etc.) is left
   * completely alone.
   *
   * @param client The BotClient, for permission/hierarchy checks against the guild.
   * @param member The GuildMember to assign roles to.
   * @param team The team string provided by the command invoker.
   * @param position The role/position string provided by the command invoker.
   * @returns true if successful, false otherwise
   */
  public async assignRoles(
    client: BotClient,
    member: GuildMember,
    team: ACMTeam,
    position: ACMPosition,
  ): Promise<boolean> {
    const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;

    // Names of every role this member currently holds that we manage (i.e. is in ROLE_CHOICES).
    const previousManagedRoles = [
      ...member.roles.cache.filter((r) => ROLE_CHOICES.includes(r.name as DiscordRole)).map((r) => r.name),
    ];

    // The full list of role IDs the member currently has, unmanaged roles included.
    const originalRoleIds = member.roles.cache.map((r) => r.id);
    const unmanagedRoleIds = member.roles.cache
      .filter((r) => !ROLE_CHOICES.includes(r.name as DiscordRole))
      .map((r) => r.id);

    // Build role list

    const rolesToAssignRaw = this.buildRoleList(team, position);
    if (!previousManagedRoles.includes(DiscordRole.Board) && rolesToAssignRaw.includes(DiscordRole.Board)) {
      rolesToAssignRaw.push(DiscordRole.Matcha); // we assign matcha for newly onboarded members
    }
    const rolesToAssign = [...new Set(rolesToAssignRaw)];

    if (rolesToAssign.length === 0) {
      Logger.warn(`No matching roles found for team "${team}" and role "${position}" (user: ${member.id})`, {
        eventType: 'roleAssignmentSkipped',
        userId: member.id,
        team,
        position,
      });
      const skippedEmbed = new MessageEmbed()
        .setTitle('⚠️ No matching roles found')
        .setDescription(`No roles matched for ${member.user.tag} with team "${team}" and position "${position}".`)
        .setColor('ORANGE');
      await channel.send({ embeds: [skippedEmbed] });
      return false;
    }

    const { ids: assignIds, missing: missingAssign } = resolveRoleIds(member, rolesToAssign);

    if (missingAssign.length > 0) {
      Logger.error(`Bot cannot assign one or more roles (missing role in guild): ${missingAssign.join(', ')}`, {
        eventType: 'roleAssignmentError',
        userId: member.id,
        missingAssign,
      });
      const missingEmbed = new MessageEmbed()
        .setTitle('🚫 Missing role(s) in guild!')
        .setDescription(
          `Couldn't assign roles to ${member.user.tag}.\n` +
            `These role names don't exist on the server: \`${missingAssign.join(', ')}\`\n` +
            'Check that the role names in Discord match the configured role names exactly.',
        )
        .setColor('DARK_RED');
      await channel.send({
        content: `*Paging <@&${client.settings.maintainerID}>!*`,
        embeds: [missingEmbed],
      });
      return false;
    }

    const finalRoleIds = [...new Set([...unmanagedRoleIds, ...assignIds])];

    const unassignedRoles = previousManagedRoles.filter((name) => !rolesToAssign.includes(name));

    // Now, we assign!

    try {
      await member.roles.set(finalRoleIds);

      Logger.info(
        `Updated roles for user ${member.id} (team: ${team}, position: ${position}). Removed: [${unassignedRoles.join(', ')}], Assigned: [${rolesToAssign.join(', ')}]`,
        {
          eventType: 'roleAssignmentSuccess',
          userId: member.id,
          removedRoles: unassignedRoles,
          assignedRoles: rolesToAssign,
          team,
          position,
        },
      );
      const successEmbed = new MessageEmbed()
        .setTitle('✅ Roles updated')
        .setDescription(`Updated roles for ${member.user.tag}.`)
        .addField('Team', team, true)
        .addField('Position', position, true)
        .addField('Assigned', rolesToAssign.map((r) => `\`${r}\``).join(', ') || 'None')
        .addField('Removed', unassignedRoles.map((r) => `\`${r}\``).join(', ') || 'None')
        .setColor('GREEN');
      await channel.send({ embeds: [successEmbed] });
      return true;
    } catch (e) {
      const error = e as any;
      Logger.error(`Error whilst updating roles for ${member.id}: ${error.message}`, {
        eventType: 'roleAssignmentError',
        userId: member.id,
        error,
      });

      // ROLLBACK: restore the exact original role list (managed + unmanaged).
      try {
        await member.roles.set(originalRoleIds);
        Logger.warn(`Rolled back: restored original roles to user ${member.id} after failed assignment`, {
          eventType: 'roleAssignmentRollbackSuccess',
          userId: member.id,
          restoredRoleIds: originalRoleIds,
        });
        const rollbackEmbed = new MessageEmbed()
          .setTitle('⚠️ Role assignment failed, rolled back')
          .setDescription(
            `Failed to assign new roles to ${member.user.tag}: ${error.message}\n` +
              'Previous roles were successfully restored.',
          )
          .setColor('DARK_RED');
        await channel.send({
          content: `*Paging <@&${client.settings.maintainerID}>!*`,
          embeds: [rollbackEmbed],
        });
        return false;
      } catch (rollbackError) {
        const rbError = rollbackError as any;
        Logger.error(
          `CRITICAL: Failed to roll back roles for ${member.id} after failed assignment: ${rbError.message}`,
          {
            eventType: 'roleAssignmentRollbackFailure',
            userId: member.id,
            error: rbError,
          },
        );
        const criticalEmbed = new MessageEmbed()
          .setTitle('🆘 CRITICAL: Role rollback failed!')
          .setDescription(
            `${member.user.tag} (${member.id}) is in a broken role state.\n` +
              `Original error: ${error.message}\n` +
              `Rollback error: ${rbError.message}\n` +
              'Manual intervention required immediately.',
          )
          .setColor('DARK_RED');
        await channel.send({
          content: `*Paging <@&${client.settings.maintainerID}>!*`,
          embeds: [criticalEmbed],
        });
        return false;
      }
    }
  }
}
