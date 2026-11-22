import got from 'got';
import schedule from 'node-schedule';
import { BotClient } from '../types';
import Logger from '../utils/Logger';
import { MessageEmbed, TextChannel } from 'discord.js';

export type ACMURLConfig = {
  username: string;
  password: string;
};

/**
 * Add an ACMURL. Makes one HTTP call to YOURLS' API.
 *
 * @param shortlink The short link to make an ACMURL for.
 * @param longlink The link to point it to.
 * @param title Title of ACMURL in YOURLS interface.
 * @private
 * @returns The new shortened ACMURL.
 */
export async function addACMURL(
  shortlink: string,
  longlink: string,
  title: string,
  config: ACMURLConfig,
): Promise<string> {
  const acmurlAPIResponse = (await got
    .post('https://acmurl.com/yourls-api.php', {
      form: {
        username: config.username,
        password: config.password,
        action: 'shorturl',
        keyword: shortlink,
        url: longlink,
        format: 'json',
        title,
      },
    })
    .json()) as any;

  if (acmurlAPIResponse.status === 'fail') {
    throw new Error(acmurlAPIResponse.code);
  }
  return acmurlAPIResponse.shorturl;
}

/**
 * Get the link that is redirected from a given ACMURL. Makes one HTTP call to YOURLS' API.
 * @param shortlink The short link to check the ACMURL for.
 * @private
 * @returns the link that `acmurl.com/shortlink` points to.
 */
export async function expandACMURL(shortlink: string, config: ACMURLConfig): Promise<string> {
  const acmurlAPIResponse = (await got
    .post('https://acmurl.com/yourls-api.php', {
      form: {
        username: config.username,
        password: config.password,
        action: 'expand',
        shorturl: shortlink,
        format: 'json',
      },
    })
    .json()) as any;
  return acmurlAPIResponse !== undefined ? acmurlAPIResponse.longurl : undefined;
}

/**
 * Overwrite the current ACMURL with a new one. Makes one HTTP call to YOURLS' API.
 * @param shortlink The short link to make an ACMURL for.
 * @param longlink The link to point it to.
 * @param title Title of ACMURL in YOURLS interface.
 * @private
 */
export async function updateACMURL(
  shortlink: string,
  longlink: string,
  title: string,
  config: ACMURLConfig,
): Promise<void> {
  await got.post('https://acmurl.com/yourls-api.php', {
    form: {
      username: config.username,
      password: config.password,
      action: 'update',
      shorturl: shortlink,
      url: longlink,
      format: 'json',
      title,
    },
  });
}

/**
 * Handle an existing ACMURL by updating it properly.
 * @param shortlink The short link to make an ACMURL for.
 * @param longlink The link to point it to.
 * @param title Title of ACMURL in YOURLS interface.
 * @private
 * @returns Tuple of old URL on YOURLS and new ACMURL.
 */
export async function handleExistingACMURL(
  shortlink: string,
  longlink: string,
  title: string,
  config: ACMURLConfig,
): Promise<[string, string]> {
  // get the old URL
  const previousURL = await expandACMURL(shortlink, config);
  // Add the new one.
  await updateACMURL(shortlink, longlink, title, config);
  return [previousURL, `https://acmurl.com/${shortlink}`];
}

/**
 * Pings the ACMURL service to ensure that it is up and alerts Dev team if it is down
 */
export async function pingACMURL(client: BotClient, config: ACMURLConfig): Promise<void> {
  const pingACMURLJob: schedule.Job = schedule.scheduleJob('*/1 * * * *', async () => {
    try {
      const healthCheck = (await got
        .post('https://acmurl.com/yourls-api.php', {
          form: {
            username: config.username,
            password: config.password,
            action: 'db-stats',
            format: 'json',
          },
        })
        .json()) as any;

      if (healthCheck.statusCode === 200 && healthCheck['db-stats']) {
        Logger.info('ACMURL Service is up and healthy! Yay!');
      }
    } catch (err) {
      // Report if there's an API error to deal with the issue.
      Logger.error('ACMURL Service is down! Pinging the maintainers!');
      const errorEmbed = new MessageEmbed()
        .setTitle('⚠️ Error with ACMURL service!')
        .setDescription('ACMURL service is down! Please restart the service!')
        .setColor('DARK_RED');
      const channel = client.channels.cache.get(client.settings.botErrorChannelID) as TextChannel;
      channel.send({
        content: `*Paging <@&${client.settings.maintainerID}>!*`,
        embeds: [errorEmbed],
      });
    }
  });
}
