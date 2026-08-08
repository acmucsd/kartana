import { Router } from 'express';
import { BotClient } from '../../types';
import { ACMPosition, ACMTeam } from '../../types/acm';

export default function assignRoute(client: BotClient) {
  const router = Router();

  router.post('/', async (req, res) => {
    const { username, team, position } = req.body;

    try {
      const guild = await client.guilds.fetch(client.settings.discordGuildID);
      const results = await guild.members.fetch({ query: username, limit: 5 });
      const member = results.find((m) => m.user.username === username);

      if (!member) {
        return res.status(400).json({
          success: false,
          error: `No guild member found with username: "${username}"`,
        });
      }

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
