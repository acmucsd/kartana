import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedFieldData, MessageEmbed } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import axios from 'axios';

// URL for Lettuce Meet GraphQL API, and the query to get the event data.
const URL = 'https://api.lettucemeet.com/graphql';
const query = `query EventQuery($id: ID!) {
  event(id: $id) {
      ...Event_event...EditEvent_event id
  }
}
fragment EditEvent_event on Event {
  id title description type pollStartTime pollEndTime 
  maxScheduledDurationMins pollDates isScheduled start end timeZone updatedAt
}
fragment Event_event on Event {
  id title description type pollStartTime pollEndTime maxScheduledDurationMins 
  timeZone pollDates start end isScheduled createdAt updatedAt user {
      id
  }
  googleEvents {
      title start end
  }
  pollResponses {
      id user {
          __typename...on AnonymousUser {
              name email
          }...on User {
              id name email
          }...on Node {
              __isNode: __typename id
          }
      }
      availabilities {
          start end
      }
      event {
          id
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
      id: string;
      title: string;
      description: string;
      type: number;
      pollStartTime: string;
      pollEndTime: string;
      maxScheduledDurationMins: number;
      timeZone: string;
      pollDates: string[];
      isScheduled: boolean;
      start: string;
      end: string;
      createdAt: string;
      updatedAt: string;
      user: {
        id: string;
      };
      googleEvents: any[];
      pollResponses: {
        id: string;
        user: {
          __typename: string;
          name: string;
          email: string;
          id: string;
        };
        availabilities: UserAvailability[];
        event: {
          id: string;
        };
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
      .setName('lettucemeetvisualizer')
      .addStringOption((option) =>
        option.setName('boardcode').setDescription('Lettuce Meet board code').setRequired(true))
      .addStringOption((option) =>
        option.setName('filterby').setDescription('Emails or names of the users to filter by').setRequired(false))
      .addNumberOption((option) =>
        option.setName('timeblock').setDescription('Time block in minutes').setRequired(false))
      .setDescription('Visualizes lettuce meet board.');

    super(client, {
      name: 'lettucemeetvisualizer',
      boardRequired: true,
      enabled: true,
      description: 'Visualizes lettuce meet board.',
      category: 'Utility',
      usage: client.settings.prefix.concat('lettucemeetvisualizer'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);

    // VpJg7 is the default board code.
    const boardCode = interaction.options.getString('boardcode');
    const filterBy = interaction.options.getString('filterby');
    const timeBlock = interaction.options.getNumber('timeblock') || 60;

    if (!boardCode) {
      await interaction.editReply('Please provide a board code.');
      return;
    }

    const regex = new RegExp(',+', 'g');
    const parsedFilterBy = filterBy?.split(regex).map(key => key.trim());

    const boardData = await this.getBoardData(boardCode);
    let pollResponses = boardData.data.event.pollResponses;
    if (parsedFilterBy) {
      pollResponses = pollResponses.filter(response =>
        parsedFilterBy.includes(response.user.name) || parsedFilterBy.includes(response.user.email));
    }

    let allPeople = pollResponses.map(response => response.user.name);

    const bestTimes = await this.getBestTimesForBlock(boardData, timeBlock, parsedFilterBy);

    const embedFields: EmbedFieldData[] = [];
    bestTimes.slice(0, 5).forEach(([startTime, availabilityData]) => {
      const date = new Date(startTime);
      const time = date.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
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
        .setTitle(`Best times for ${timeBlock} minutes`)
        .setColor('#47d175')
        .addFields(embedFields);

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * @param boardData board data
   * @param timeBlock time block in minutes
   * @param filterBy emails or names of the users to filter by
   * @returns best times for the given time block
   */
  private async getBestTimesForBlock(
    boardData: BoardData,
    timeBlock: number,
    filterBy?: string[],
  ): Promise<[number, AvailabilityData][]> {
    const availabilityMap = await this.getAvailabilityMap(boardData, filterBy);
    const availabilityArray = Array.from(availabilityMap.entries());

    const bestTimes: [number, AvailabilityData][] = availabilityArray.map(([startTime, availabilityData]) => {
      // Gets the minimum number of people available for each time block.
      let minimumAvailable = availabilityData.numAvailable;
      const end = startTime + timeBlock * 60 * 1000;
      for (let i = startTime; i < end; i += LETTUCE_MEET_INTERVAL * 60 * 1000) {
        const currentNumber = availabilityMap.get(i)?.numAvailable || 0;
        minimumAvailable = Math.min(minimumAvailable, currentNumber);
      }

      // Returns the start time and the minimum number of people available.
      return [startTime, { numAvailable: minimumAvailable, peopleAvailable: availabilityData.peopleAvailable }];
    });

    bestTimes.sort((a, b) => b[1].numAvailable - a[1].numAvailable);
    return bestTimes.map(([startTime, availablityData]) => [startTime, availablityData]);
  }

  /**
   * Gets the availability map for a given board.
   * @param boardData board data
   * @param filterBy emails or names of the users to filter by
   * @returns availability map for the given board
   */
  private async getAvailabilityMap(boardData: BoardData, filterBy?: string[]): Promise<Map<number, AvailabilityData>> {
    const pollResponses = boardData.data.event.pollResponses;
    const filteredPollResponses = pollResponses.filter((pollResponse) => {
      if (!filterBy) {
        return true;
      }

      return filterBy.includes(pollResponse.user.email) || filterBy.includes(pollResponse.user.name);
    });

    // Key is the start time for the interval, value is the number of people available.
    const availabilityMap = new Map<number, AvailabilityData>();
    filteredPollResponses.forEach((pollResponse) => {
      pollResponse.availabilities.forEach((availability) => {
        // Parses start and end date into a Date object
        // Substring to remove the 'Z' at the end of the string.
        const start = new Date(availability.start.substring(0, availability.start.length - 1));
        const end = new Date(availability.end.substring(0, availability.end.length - 1));

        // Loops through each LETTUCE_MEET_INTERVAL minute interval and increments the number of people available.
        for (let i = start.getTime(); i < end.getTime(); i += LETTUCE_MEET_INTERVAL * 60 * 1000) {
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
    console.log('Getting user availability...');
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
    console.log('Getting board data...');
    const response = await axios.post(URL, {
      query,
      variables: {
        id: boardCode,
      },
    });

    return response.data as BoardData;
  }
}
