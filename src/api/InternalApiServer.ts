import express from 'express';
import { BotClient } from '../types';
import assignRoute from './routes/assign';

export default class InternalApiServer {
  constructor(private client: BotClient) {}

  start(port: number) {
    const app = express();

    app.use(express.json());

    app.get('/health', (_, res) => {
      res.json({ status: 'ok' });
    });

    app.use('/assign', assignRoute(this.client));

    app.listen(port, () => {
      console.log(`Internal API running on port ${port}`);
    });
  }
}
