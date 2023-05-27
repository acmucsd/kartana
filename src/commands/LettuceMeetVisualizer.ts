import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
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
        option.setName('boardcode').setDescription('Lettuce Meet board code').setRequired(false))
      .addStringOption((option) => option.setName('name').setDescription('Name of the user').setRequired(false))
      .addStringOption((option) => option.setName('email').setDescription('Email of the user').setRequired(false))
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
    
    const boardCode = interaction.options.getString('boardcode') || 'VpJg7';
    // const name = interaction.options.getString('name');
    // const email = interaction.options.getString('email');
    const timeBlock = interaction.options.getNumber('timeblock') || 60;

    // const name = 'Aniket';
    // const email = '';

    // TODO: Make the message look nicer.
    const bestTimes = await this.getBestTimesForBlock(boardCode, timeBlock);
    const allPeople = [...new Set(bestTimes.map(([, availabilityData]) => availabilityData.peopleAvailable).flat())];
    let message = `Best times for ${timeBlock} minutes:\n`;

    bestTimes.slice(0, 5).forEach(([startTime, availabilityData]) => {
      const date = new Date(startTime);
      const time = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const unavailablePeople = allPeople.filter(person => !availabilityData.peopleAvailable.includes(person));
      message += `${time} - ${availabilityData.numAvailable} people available. ` +
        `Unavailable people: ${unavailablePeople.join(', ')}\n`;
    });

    await interaction.editReply(message);
  }

  /**
   * @param boardCode code of the lettuce meet board
   * @param timeBlock time block in minutes
   * @returns best times for the given time block
   */
  private async getBestTimesForBlock(boardCode: string, timeBlock: number): Promise<[number, AvailabilityData][]> {
    const availabilityMap = await this.getAvailabilityMap(boardCode);
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
   * @param boardCode code of the lettuce meet board
   * @returns availability map for the given board
   */
  private async getAvailabilityMap(boardCode: string): Promise<Map<number, AvailabilityData>> {
    const boardData = await this.getBoardData(boardCode);
    const pollResponses = boardData.data.event.pollResponses;

    // Key is the start time for the interval, value is the number of people available.
    const availabilityMap = new Map<number, AvailabilityData>();
    pollResponses.forEach((pollResponse) => {
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
    { name, email }: { name?: string | null, email?: string | null }): Promise<UserAvailability[] | null> {
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
