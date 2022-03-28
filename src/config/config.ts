import { BotSettings } from '../types';

export default {
  apiKeys: {
  },
  acmurl: {
    username: '',
    password: '',
  },
  clientID: '',
  clientOptions: {
    intents: [
      'GUILDS',
      'GUILD_INTEGRATIONS',
      'GUILD_WEBHOOKS',
      'GUILD_MESSAGES',
      'DIRECT_MESSAGES',
      'GUILD_MESSAGE_REACTIONS',
      'DIRECT_MESSAGE_REACTIONS',
    ],
  },
  portalAPI: {
    username: '',
    password: '',
  },
  presence: {
    activities: [{
      type: 'WATCHING',
      name: 'acmurl.com/poggers',
    }],
    status: 'online',
  },
  token: '',
  prefix: '!',
  paths: {
    commands: 'src/commands',
    events: 'src/events',
  },
} as BotSettings;
