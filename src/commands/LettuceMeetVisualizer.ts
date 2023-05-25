import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';
import axios from 'axios';

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

interface UserAvailability {
  start: string;
  end: string;
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
      .addStringOption((option) => option.setName('name').setDescription('Name of the user').setRequired(false))
      .addStringOption((option) => option.setName('email').setDescription('Email of the user').setRequired(false))
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
    await super.defer(interaction, true);
    
    const boardCode = interaction.options.getString('boardcode')!;
    const name = interaction.options.getString('name');
    const email = interaction.options.getString('email');

    // const boardCode = 'VpJg7';
    // const name = 'Aniket';
    // const email = '';

    const userAvailability = await this.getUserAvailability(boardCode, { name, email });
    console.log(userAvailability);
  }

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
