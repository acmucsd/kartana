import { Router } from 'express';
import { BotClient } from '../../types';
import { ACMPosition, ACMTeam } from '../../types/acm';

export default function assignRoute(client: BotClient) {
  const router = Router();

  router.post('/', async (req, res) => {
    const { userId, team, position } = req.body;

    try {
      const guild = await client.guilds.fetch(client.settings.discordGuildID);
      const member = await guild.members.fetch(userId);

      const success = await client.discordRoleManager.assignRoles(
        client,
        member,
        team as ACMTeam,
        position as ACMPosition,
      );

      res.json({ success });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: (err as Error).message,
      });
    }
  });

  return router;
}
