import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedFieldData, MessageEmbed } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import axios from 'axios';
import Logger from '../utils/Logger';
import { DateTime } from 'luxon';

// URL for Lettuce Meet GraphQL API, and the query to get the event data.
const URL = 'https://api.lettucemeet.com/graphql';
const query = `query EventQuery($id: ID!) {
    event(id: $id) {
      ...Event_event
    }
  }
  fragment Event_event on Event {
    title
    pollResponses {
      user {
        ...on AnonymousUser {
            name email
        }
        ...on User {
            name email
        }
      }
      availabilities {
        start end
      }
    }
  }`;
const LETTUCE_MEET_INTERVAL = 30;

/**
 * Data returned by the Lettuce Meet GraphQL API.
 */
interface BoardData {
  data: {
    event: {
      title: string;
      pollResponses: {
        user: {
          name: string;
          email: string;
        };
        availabilities: UserAvailability[];
      }[];
    };
  };
}

/**
 * Availability of a user.
 */
interface UserAvailability {
  start: string;
  end: string;
}

/**
 * Availability data for a time block
 */
interface AvailabilityData {
  numAvailable: number;
  peopleAvailable: string[];
}


/**
 * Visualizes the Lettuce Meet board.
 */
export default class LettuceMeetVisualizer extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('lettucemeet')
      .addStringOption((option) =>
        option.setName('code').setDescription('Lettuce Meet board code (code at the end of url)')
          .setRequired(true))
      .addNumberOption((option) =>
        option.setName('duration').setDescription('Desired meeting duration (in minutes) [default is 60 minutes]')
          .setRequired(false))
      .addStringOption((option) =>
        option.setName('users').setDescription('Emails or names of the users to include in the results')
          .setRequired(false))
      .addNumberOption((option) =>
        option.setName('n').setDescription('Number of results to show (default 5).')
          .setRequired(false))
      .setDescription('Visualizes lettuce meet board.');

    super(client, {
      name: 'lettucemeet',
      boardRequired: true,
      enabled: true,
      description: 'Visualizes lettuce meet board.',
      category: 'Utility',
      usage: client.settings.prefix.concat('lettucemeet'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, false);

    const boardCode = interaction.options.getString('code');
    const filterBy = interaction.options.getString('users');
    const timeBlock = interaction.options.getNumber('duration') || 60;
    const n = interaction.options.getNumber('n') || 5;

    if (!boardCode) {
      await interaction.editReply('Please provide a board code.');
      return;
    }

    const filterByArray = filterBy?.split(',').map(key => key.trim().toLowerCase());

    const boardData = await this.getBoardData(boardCode);
    if (!boardData?.data?.event) {
      await interaction.editReply('Invalid board code.');
      return;
    }

    let pollResponses = boardData.data.event.pollResponses;
    if (filterByArray) {
      pollResponses = pollResponses.filter(response =>
        filterByArray.includes(response.user.name.toLowerCase()) ||
        filterByArray.includes(response.user.email.toLowerCase()));
    }

    const allPeople = pollResponses.map(response => response.user.name);
    const bestTimes = await this.getBestTimesForBlock(boardData, timeBlock, filterByArray);

    const embedFields: EmbedFieldData[] = [];
    // Selects the top n best times
    bestTimes.slice(0, n).forEach(({ blockStartTime, availabilityData }) => {
      const date = DateTime.fromMillis(blockStartTime);
      const time = date.toLocaleString(DateTime.DATETIME_MED);
      const unavailablePeople = allPeople.filter(person => !availabilityData.peopleAvailable.includes(person));

      let message = `${availabilityData.numAvailable}/${allPeople.length} people available.`;
      if (unavailablePeople.length > 0) {
        message += ` Unavailable: ${unavailablePeople.join(', ')}`;
      }

      embedFields.push({
        name: `⏰ ${time}`,
        value: message,
      });
    });

    const embed =
      new MessageEmbed()
        .setTitle(`${boardData.data.event.title}`)
        .setURL(`https://lettucemeet.com/l/${boardCode}`)
        .setDescription(`Best times for **${timeBlock} minutes**`)
        .setColor('#47d175')
        .addFields(embedFields);

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * @param boardData the data received from the Lettuce Meet API, containing the board information. Can be retrieved by
   * calling the getBoardData function.
   * @param timeBlock the length of the meeting, in minutes
   * @param filterBy emails or names of the users to filter by
   * @returns best times for the given time block
   */
  private async getBestTimesForBlock(
    boardData: BoardData,
    timeBlock: number,
    filterBy?: string[],
  ): Promise<{ blockStartTime: number, availabilityData: AvailabilityData }[]> {
    const availabilityMap = await this.getAvailabilityMap(boardData, filterBy);
    const availabilityArray = Array.from(availabilityMap.entries());

    const bestTimes: { blockStartTime: number, availabilityData: AvailabilityData }[] = availabilityArray
      .map(([startTime, availabilityData]) => {
      // Gets the minimum number of people available for each time block.
        let peopleAvailable = availabilityData.peopleAvailable;

        // timeBlock and LETTUCE_MEET_INTERVAL are in minutes - convert to milliseconds.
        const end = startTime + timeBlock * 60 * 1000;
        for (let i = startTime; i < end; i += LETTUCE_MEET_INTERVAL * 60 * 1000) {
          peopleAvailable = peopleAvailable.filter(person => availabilityMap.get(i)?.peopleAvailable?.includes(person));
        }

        // Returns the start time and the minimum number of people available.
        return {
          blockStartTime: startTime,
          availabilityData: { numAvailable: peopleAvailable.length, peopleAvailable },
        };
      });

    bestTimes.sort((a, b) => b.availabilityData.numAvailable - a.availabilityData.numAvailable);
    return bestTimes;
  }

  /**
   * Gets a map containing the number of people available for each time block (and a list of the people). Can be used
   * to get the best times for a given time block.
   *
   * @param boardData the data received from the Lettuce Meet API, containing the board information. Can be retrieved by
   * calling the getBoardData function.
   * @param filterBy emails or names of the users to filter by
   * @returns availability map for the given board
   */
  private async getAvailabilityMap(boardData: BoardData, filterBy?: string[]): Promise<Map<number, AvailabilityData>> {
    const pollResponses = boardData.data.event.pollResponses;
    const filteredPollResponses = pollResponses.filter((pollResponse) => {
      if (!filterBy) {
        return true;
      }

      return filterBy.includes(pollResponse.user.email.toLowerCase()) ||
        filterBy.includes(pollResponse.user.name.toLowerCase());
    });

    // Key is the start time for the interval, value is the number of people available.
    const availabilityMap = new Map<number, AvailabilityData>();
    filteredPollResponses.forEach((pollResponse) => {
      pollResponse.availabilities.forEach((availability) => {
        // Parses start and end date into a Date object
        // Substring to remove the 'Z' at the end of the string.
        const start = DateTime.fromISO(availability.start.substring(0, availability.start.length - 1));
        const end = DateTime.fromISO(availability.end.substring(0, availability.end.length - 1));

        // Loops through each LETTUCE_MEET_INTERVAL minute interval and increments the number of people available.
        for (let i = start.toMillis(); i < end.toMillis(); i += LETTUCE_MEET_INTERVAL * 60 * 1000) {
          const numAvailable = (availabilityMap.get(i)?.numAvailable || 0) + 1;
          const peopleAvailable = availabilityMap.get(i)?.peopleAvailable || [];

          peopleAvailable.push(pollResponse.user.name);
          availabilityMap.set(i, { numAvailable, peopleAvailable });
        }
      });
    });

    return availabilityMap;
  }

  /**
   * Returns the user availability a specific user.
   * @param boardCode code of the lettuce meet board
   * @param userOptions the user's name or email
   * @returns user's availability or null if the user is not found
   */
  private async getUserAvailability(boardCode: string,
    { name, email }: {
      name?: string | null,
      email?: string | null
    }): Promise<UserAvailability[] | null> {
    Logger.info('/lettucemeet: Getting user availability...');
    const boardData = await this.getBoardData(boardCode);

    const pollResponses = boardData.data.event.pollResponses;
    const matchedUsers = pollResponses
      .filter((pollResponse) => pollResponse.user.name === name || pollResponse.user.email === email);

    if (matchedUsers.length === 0) {
      return null;
    }

    const matchedUser = matchedUsers[0];
    return matchedUser.availabilities;
  }

  /**
   * Gets all the data of the lettuce meet board.
   * @param boardCode code of the lettuce meet board
   * @returns data returned by the Lettuce Meet GraphQL API
   */
  private async getBoardData(boardCode: string): Promise<BoardData> {
    Logger.info('/lettucemeet: Getting board data...');
    const response = await axios.post(URL, {
      query,
      variables: {
        id: boardCode,
      },
    });

    return response.data as BoardData;
  }
}
