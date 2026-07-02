/**
 * The Notion Hosted Event database schema.
 *
 * Extracted from Notion API using the `get-database-props.js` script.
 */
export const notionHostedEvent = {
  'Funding?': {
    id: '%3E%3Bv%5D',
    name: 'Funding?',
    description: null,
    type: 'select',
    select: {
      options: [
        {
          id: 'Lz^I',
          name: 'Yes',
          color: 'green',
          description: null,
        },
        {
          id: 'oQn[',
          name: 'No',
          color: 'red',
          description: null,
        },
      ],
    },
  },
  Team: {
    id: '%3Fsuf',
    name: 'Team',
    description: null,
    type: 'select',
    select: {
      options: [
        {
          id: '7796b177-1111-4e44-ad74-93dd553ed47e',
          name: 'Board',
          color: 'yellow',
          description: null,
        },
        {
          id: 'ec733d97-9ebd-4bf9-bf2c-ce69675e7520',
          name: 'Development',
          color: 'default',
          description: null,
        },
        {
          id: '75a70a6a-ca4c-413e-91b0-1af58db97abf',
          name: 'Events',
          color: 'blue',
          description: null,
        },
        {
          id: 'b7b5dc83-6f85-43f4-b603-5330754e015c',
          name: 'Finance',
          color: 'brown',
          description: null,
        },
        {
          id: 'aaaddb16-d2f6-4605-8051-b264b6962a8c',
          name: 'Membership',
          color: 'purple',
          description: null,
        },
        {
          id: '9a14180b-4abd-42a0-aee9-ef17ccd089a1',
          name: 'Projects',
          color: 'brown',
          description: null,
        },
        {
          id: '2d7414d8-92cf-4ffd-ac37-5f606f298bdb',
          name: 'AI',
          color: 'red',
          description: null,
        },
        {
          id: '7bd5a7bb-65fd-4382-807e-fa09c27ac698',
          name: 'Cyber',
          color: 'green',
          description: null,
        },
        {
          id: 'fbce377a-38ca-4982-870f-0c85135689d6',
          name: 'Design',
          color: 'pink',
          description: null,
        },
        {
          id: '278dab57-19bb-47e1-828c-0f7f78ddd12e',
          name: 'Hack',
          color: 'orange',
          description: null,
        },
        {
          id: '69d3b605-4f35-49e9-a665-ee97171687a2',
          name: 'Hackathon',
          color: 'gray',
          description: null,
        },
      ],
    },
  },
  'Calendar Event': {
    id: 'QZWa',
    name: 'Calendar Event',
    description: null,
    type: 'relation',
    relation: {
      database_id: '2b114391-5b12-8196-b759-e5bf91f51489',
      data_source_id: '2b114391-5b12-8117-9eee-000b3b31dbf6',
      type: 'dual_property',
      dual_property: {
        synced_property_name: 'Hosted Events Sheet',
        synced_property_id: 'ICQM',
      },
    },
  },
  'Host(s)': {
    id: 'QqJq',
    name: 'Host(s)',
    description: null,
    type: 'people',
    people: {},
  },
  'Event Type': {
    id: '%5B%5CEs',
    name: 'Event Type',
    description: null,
    type: 'rich_text',
    rich_text: {},
  },
  'Marketing?': {
    id: '%5CBw%3A',
    name: 'Marketing?',
    description: null,
    type: 'select',
    select: {
      options: [
        {
          id: 'W_:?',
          name: 'Yes',
          color: 'green',
          description: null,
        },
        {
          id: 'a=IJ',
          name: 'No',
          color: 'red',
          description: null,
        },
      ],
    },
  },
  Date: {
    id: '%5CcKz',
    name: 'Date',
    description: null,
    type: 'date',
    date: {},
  },
  'PEEF Submitted': {
    id: 'i%40Yr',
    name: 'PEEF Submitted',
    description: null,
    type: 'checkbox',
    checkbox: {},
  },
  'PEEF Written': {
    id: 'yE%3Ek',
    name: 'PEEF Written',
    description: null,
    type: 'checkbox',
    checkbox: {},
  },
  Name: {
    id: 'title',
    name: 'Name',
    description: null,
    type: 'title',
    title: {},
  },
} as const;
