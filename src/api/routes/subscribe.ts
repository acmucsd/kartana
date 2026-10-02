import { Router } from 'express';
import { BotClient } from '../../types';
import { isEmail } from 'validator';

export default function subscribeRoute(client: BotClient) {
  const router = Router();

  // Requires email, discord in request body
  router.post('/', async (req, res) => {
    const { email, discordID } = req.body;

    const validEmail = typeof email == 'string' && isEmail(email) && email.endsWith('@acmucsd.org');

    const validDiscordID = typeof discordID === 'string' && /^[1-9]\d{16,19}$/.test(discordID);

    if (!validEmail || !validDiscordID) {
      return res.status(400).json({
        success: false,
        error: 'Provide a valid ACM email and Discord ID.',
      });
    }

    try {
      client.googleCalendarManager.meetingPingsSchema.subscribeNewGuest(email, discordID);

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Could not save subscription.',
      });
    }
  });

  return router;
}
