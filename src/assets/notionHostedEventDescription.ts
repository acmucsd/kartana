/**
 * This is the template description for a Hosted Event Page on Notion, in Rich Text Format.
 * This is used in src/event-notion/NotionEventPage to automatically fill
 * out the description field as needed.
 */

import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';

/* eslint-disable max-len */
export const notionHostedEventDescription: BlockObjectRequest[] = [
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Description', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              'Quick description of your event to be marketed. Also feel free to change the icon and make it fun!',
            link: null,
          },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Location', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { color: 'default', rich_text: [] },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Funding', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Is there anything you may need internal funding for?', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Marketing', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_2',
    heading_2: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'FB ACMURL: ', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_2',
    heading_2: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Check-in Code:', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: { color: 'default', rich_text: [] },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'list any specific marketing requests here', link: null },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: ' ', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Relevant Links', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Put any links for your event here, like links to slides, zoom, etc.', link: null },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'To-Dos', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              'Do you need to organize food pickup? Do you need volunteers? Anything that needs to be done in preparation for the event should go here',
            link: null,
          },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'to_do',
    to_do: { checked: false, color: 'default', rich_text: [] },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Timeline/Itinerary', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              'Write a detailed timeline for your event. Think about and write down what is happening at the event every 5 minutes. There may be intervals where you are still doing what you were doing 5 minutes ago, and you can skip those.',
            link: null,
          },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: '##:00', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: '##:05', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: '##:10', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Planning', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              'put the planning for the event here, may be ideas, how a specific game/activity is going to work, notes, etc.',
            link: null,
          },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'Event Pictures', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              'Add pictures of your event showing the attendance for AS purposes!',
            link: null,
          },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'heading_1',
    heading_1: {
      is_toggleable: false,
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: { content: 'How did it go?', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: {
      color: 'default',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              'Come back after your event and write a brief reflection on how you thought the event went, what can be improved for next time? Did the plans you made work well for the goals of the event? Try to answer these questions as well (we will use the answers for funding in the future):',
            link: null,
          },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'code',
    code: {
      caption: [],
      language: 'plain text',
      rich_text: [
        {
          type: 'text',
          text: {
            content:
              '* What was the purpose or goal of the event?\n* Actual attendance (# ucsd undergraduate students)\n* If there was a difference in the estimated and actual attendance numbers, please explain why you think there was a difference. How can you decrease the difference in attendance numbers for future events?\n* Do you consider the event to have been a success? Why or why not?\n* What would you describe as your most valuable resource?\n* What if any complications arose during the event?\n* What steps or items would you improve for the next event?\n* What online changes would you make to advertisements or promotion?',
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
  },
  {
    type: 'paragraph',
    paragraph: { color: 'default', rich_text: [] },
  },
];
