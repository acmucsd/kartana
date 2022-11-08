import { BotSettings } from '../types';

export default {
  apiKeys: {
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
  presence: {
    activities: [{
      type: 'PLAYING',
      name: 'with Host Forms',
    }],
    status: 'online',
  },
  token: '',
  prefix: '!',
  paths: {
    commands: 'src/commands',
    events: 'src/events',
  },
  notionIntegrationToken: '',
  notionCalendarID: '',
  notionMeetingNotesID: '',
  googleSheetsServiceAccountEmail: '',
  googleSheetsKeyFile: '',
  googleSheetsDocID: '',
  googleSheetsSheetName: '',
  discordGuildID: '',
  discordWebhookURL: '',
  maintainerID: '',
  logisticsTeamID: '',
  botErrorChannelID: '',
  scheduledMessageGoogleCalendarID: '',
} as BotSettings;
