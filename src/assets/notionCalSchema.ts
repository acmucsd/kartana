/**
 * The Notion Calendar database schema.
 * 
 * This effectively is a copy of the `database.properties` JSON object
 * extracted from a copy of the ACM UCSD Notion Calendar as of
 * Fri, Jan 27 2023 19:54:13 PST.
 */
export const notionCalSchema = {
  'Funding Status': {
    'id': '%23D%22x',
    'name': 'Funding Status',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '3078cd1d-d004-4446-a3a9-2e58716bf5da',
          'name': 'Funding Not Requested',
          'color': 'default',
        },
        {
          'id': 'ababba96-cb7d-446a-b9f0-ed09de544554',
          'name': 'Funding TODO',
          'color': 'orange',
        },
        {
          'id': 'b176ea4f-765d-4501-8422-7690de5549a1',
          'name': 'AS Forms Submitted',
          'color': 'yellow',
        },
        {
          'id': 'ac96949e-a060-49bc-a14f-4913a5803e40',
          'name': 'AS Funding Approved',
          'color': 'blue',
        },
        {
          'id': 'c6d41dc8-6628-49c0-ab6a-9828793520f2',
          'name': 'Funding Completed',
          'color': 'green',
        },
        {
          'id': '28d2388f-718c-4d48-b66d-4be685db8ecf',
          'name': 'Waiting for Reimbursement',
          'color': 'purple',
        },
        {
          'id': 'c8c14460-0a9d-40ff-adaa-e186f1b8c938',
          'name': 'Funding CANCELLED',
          'color': 'red',
        },
        {
          'id': '13e5c209-c3ec-484f-9348-5a322d513079',
          'name': 'Funding In Progress',
          'color': 'pink',
        },
        {
          'id': '472e62ae-77d1-47db-9ff5-5ea97c1f54bc',
          'name': 'PEEF  to be completed',
          'color': 'gray',
        },
        {
          'id': '1649066e-886a-4699-b584-0c38e08d5cba',
          'name': 'PEEF Completed',
          'color': 'brown',
        },
        {
          'id': '6c69cfc7-b3eb-4a50-9177-58dbd45c2785',
          'name': 'Internal Funding',
          'color': 'brown',
        },
        {
          'id': 'aec2b820-b44d-45fa-9525-e92d0c0bc0d8',
          'name': 'PEEF suspended',
          'color': 'brown',
        },
      ],
    },
  },
  'Type': {
    'id': '%2B%5E8f',
    'name': 'Type',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '97cc0759-5724-497a-b170-6bca0ede125a',
          'name': 'Competition',
          'color': 'red',
        },
        {
          'id': '9cb0d917-dbbf-442b-997a-2a880e3e23a2',
          'name': 'Workshop',
          'color': 'orange',
        },
        {
          'id': '34ea9762-79c8-4241-9262-53bf6aaceb09',
          'name': 'Industry Panel',
          'color': 'yellow',
        },
        {
          'id': 'c9eb3b12-4588-4d90-ae32-20f83cfecde8',
          'name': 'Social',
          'color': 'green',
        },
        {
          'id': '7c49c68f-a4c4-4575-bf42-a7d7e75f7ae6',
          'name': 'Seminar',
          'color': 'blue',
        },
        {
          'id': '9c9b225f-a15c-4967-9287-a7393916c5d1',
          'name': 'GBM',
          'color': 'purple',
        },
        {
          'id': 'c11a4fd8-2787-41c9-ada7-65ea0b021170',
          'name': 'Meeting',
          'color': 'gray',
        },
        {
          'id': '065ce7d2-9578-42e3-b7fe-ae6077d66d43',
          'name': 'Non-Event',
          'color': 'default',
        },
        {
          'id': '15ff1e05-77b0-44e5-b1b3-ebe97c7c29ba',
          'name': 'Unconfirmed Details',
          'color': 'brown',
        },
        {
          'id': '57272d1e-cda2-4337-b5e4-f054f3e4a818',
          'name': 'CANCELLED',
          'color': 'brown',
        },
        {
          'id': '28c77a2a-f1c6-4746-817f-0cbee8ad8a1e',
          'name': 'Talk',
          'color': 'purple',
        },
        {
          'id': 'dd8839f8-08df-4ff9-a568-566f3eb48269',
          'name': 'Sponsored Event',
          'color': 'orange',
        },
        {
          'id': '69179491-8f97-4ba7-b07d-09af451cc78a',
          'name': 'Projects Showcase',
          'color': 'green',
        },
        {
          'id': 'a2f5d976-43e4-45ae-8745-37dbdada7184',
          'name': 'Projects Kickoff',
          'color': 'blue',
        },
        {
          'id': '1e08b792-a83c-49f1-b696-8b3d53004c5c',
          'name': 'Kickoff',
          'color': 'blue',
        },
        {
          'id': 'd6dcbc95-2395-4e7c-b968-c16fcec83008',
          'name': 'Mid Quarter Meeting',
          'color': 'green',
        },
        {
          'id': '0d903a72-17d0-4e0f-a322-dc3cc2257190',
          'name': 'Info Session',
          'color': 'green',
        },
        {
          'id': 'd54031b1-9449-4198-adbe-477c2cec7753',
          'name': 'Other (See Comments)',
          'color': 'pink',
        },
        {
          'id': '56410925-4f27-4c8f-b1bd-99ed593389f5',
          'name': 'PENDING EVENT HOST WORKSHOP',
          'color': 'red',
        },
        {
          'id': '29b70f22-6ec6-4d05-a096-e065deae77af',
          'name': 'OPEN RESERVATION',
          'color': 'orange',
        },
      ],
    },
  },
  'PR Status': {
    'id': '9%22tk',
    'name': 'PR Status',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': 'ad498129-49c1-4382-8077-de0a1a4818d8',
          'name': 'PR Not Requested',
          'color': 'default',
        },
        {
          'id': 'da42a670-f25f-418c-ae28-a3fb09e8ed1c',
          'name': 'PR TODO',
          'color': 'orange',
        },
        {
          'id': '29ff9c2d-45ae-486a-8a43-1b1a6daf75fc',
          'name': 'PR Completed',
          'color': 'green',
        },
        {
          'id': '85c7f06e-69bd-409b-9da5-9ae3883ac775',
          'name': 'PR In Progress',
          'color': 'yellow',
        },
        {
          'id': '7dd3c51c-367a-4d44-b599-7e7ad297b7c8',
          'name': 'PR Done',
          'color': 'brown',
        },
        {
          'id': '7b59d4be-67d8-47f2-a8a9-03c617d9823e',
          'name': 'PR Unconfirmed Details',
          'color': 'purple',
        },
        {
          'id': 'a714409f-6eff-4dd7-b74f-10fb5490ae25',
          'name': 'PR Waiting for link update',
          'color': 'pink',
        },
        {
          'id': '66559891-92fa-4aa6-a4be-9dde92393333',
          'name': 'PR Cancelled',
          'color': 'gray',
        },
      ],
    },
  },
  'Intake Form Status': {
    'id': '%3BnPn',
    'name': 'Intake Form Status',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '733e89dc-e63c-4340-b773-23288ceeaf00',
          'name': 'Intake Form N/A',
          'color': 'default',
        },
        {
          'id': 'cacd21cb-0852-4e4a-80e1-5310246337d8',
          'name': 'Intake Form TODO',
          'color': 'orange',
        },
        {
          'id': 'c5e35290-36b7-4900-b6e6-a609ab0a10f4',
          'name': 'Intake Form In Progress',
          'color': 'yellow',
        },
        {
          'id': '48a581e5-977d-4a3a-9034-28f1252800e4',
          'name': 'Intake Form Pending Approval',
          'color': 'purple',
        },
        {
          'id': '1f190ba0-b47a-4e0e-bae4-c65e01c15fdd',
          'name': 'Intake Form Completed',
          'color': 'green',
        },
        {
          'id': '6a1a9bca-6d47-4d79-b1f3-c7651353505d',
          'name': 'Intake Form CANCELLED',
          'color': 'red',
        },
      ],
    },
  },
  'Tech Requests': {
    'id': '%3Enm%7D',
    'name': 'Tech Requests',
    'type': 'rich_text',
    'rich_text': {},
  },
  'TAP Status': {
    'id': '%3Fz6_',
    'name': 'TAP Status',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': 'a60b6374-d043-4b57-87ca-e8534e5727bd',
          'name': 'TAP N/A',
          'color': 'default',
        },
        {
          'id': '2608086e-2238-4de3-a9e9-81bc0bc4d988',
          'name': 'TAP TODO',
          'color': 'orange',
        },
        {
          'id': '4c05774b-58ba-40b9-99a3-662d88f66cef',
          'name': 'TAP In Progress',
          'color': 'yellow',
        },
        {
          'id': '3c9ce41e-a0a1-431e-98a4-8d3a37666104',
          'name': 'TAP Pending Approval',
          'color': 'purple',
        },
        {
          'id': '4625cb7e-33b7-4701-8995-28ccf51f4d90',
          'name': 'TAP Approved',
          'color': 'green',
        },
        {
          'id': '0d211613-098b-49df-bba5-9ebc611f9ef5',
          'name': 'TAP Denied',
          'color': 'red',
        },
        {
          'id': '541fdccf-18cd-4e14-80a0-41257902fe6a',
          'name': 'TAP CANCELLED',
          'color': 'red',
        },
      ],
    },
  },
  'Funding Amount Approved': {
    'id': '%40gPB',
    'name': 'Funding Amount Approved',
    'type': 'number',
    'number': {
      'format': 'dollar',
    },
  },
  'Approved Intake': {
    'id': '%40hOD',
    'name': 'Approved Intake',
    'type': 'files',
    'files': {},
  },
  'Funding Manager': {
    'id': 'APk4',
    'name': 'Funding Manager',
    'type': 'people',
    'people': {},
  },
  'Booking Details': {
    'id': 'Ab%3Ae',
    'name': 'Booking Details',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Marketing Description': {
    'id': 'BW%2Cy',
    'name': 'Marketing Description',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Additional Finance Info': {
    'id': 'E%3BiJ',
    'name': 'Additional Finance Info',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Location': {
    'id': 'GV%25O',
    'name': 'Location',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '0f43e2c8-48ae-4ca3-9bc3-98428254f899',
          'name': 'Zoom (See Details)',
          'color': 'yellow',
        },
        {
          'id': 'ad4d5527-56ea-415e-9eae-b1779eb5fc51',
          'name': 'Discord (See Details)',
          'color': 'blue',
        },
        {
          'id': '015cbd2b-663e-40e8-961d-a510b9a97b13',
          'name': 'Qualcomm Room',
          'color': 'default',
        },
        {
          'id': '24b079d2-bfbb-4071-8326-e0044553e9cb',
          'name': 'Henry Booker Room',
          'color': 'default',
        },
        {
          'id': '4e4a6914-6561-476d-87b9-d92091b2286b',
          'name': 'Fung Auditorium',
          'color': 'default',
        },
        {
          'id': '5c493725-ea0a-4f06-ae06-7ba3fcc8cfac',
          'name': 'CSE 1202',
          'color': 'default',
        },
        {
          'id': '57a7a39f-7960-484d-b258-d11eb0595fc4',
          'name': 'CSE 2154',
          'color': 'default',
        },
        {
          'id': '94a1d714-99d1-4d77-a96c-206eb2e022e0',
          'name': 'CSE 4140',
          'color': 'default',
        },
        {
          'id': 'cbc67309-d8bf-4abb-a959-ece3d41dfd91',
          'name': 'Room 2315',
          'color': 'default',
        },
        {
          'id': '6250b696-d92c-44a6-8e85-0d345f0e9319',
          'name': 'PC Eleanor Roosevelt Room',
          'color': 'default',
        },
        {
          'id': 'c9de9a14-22ac-4d78-bb31-e8f919aa6456',
          'name': 'PC Marshall Room',
          'color': 'default',
        },
        {
          'id': 'd3dec2f1-4d56-49bb-9139-ec3775188d11',
          'name': 'PC Muir Room',
          'color': 'default',
        },
        {
          'id': '4ed4f576-ace7-47c8-b5ee-90d9b6b241bd',
          'name': 'PC Warren Room',
          'color': 'default',
        },
        {
          'id': '8565ad21-c581-4d14-85a9-e5b45cb27185',
          'name': 'PC Revelle Room',
          'color': 'default',
        },
        {
          'id': 'c1410447-b3bc-4a88-a51c-682197cdbe89',
          'name': 'PC Red Shoe Room',
          'color': 'default',
        },
        {
          'id': '99a14791-be01-451f-a735-796b0138a181',
          'name': 'PC Snake Path Room',
          'color': 'default',
        },
        {
          'id': '6aee73ee-677b-47da-a547-dd98ea1d6f52',
          'name': 'PC East Ballroom',
          'color': 'default',
        },
        {
          'id': '40120553-92ef-402e-ae2a-2b9e380b15f1',
          'name': 'PC West Ballroom',
          'color': 'default',
        },
        {
          'id': 'a4b65aa3-c36c-4cc0-b765-e8ab38175948',
          'name': 'Student Services Center Multi-Purpose Room',
          'color': 'default',
        },
        {
          'id': '4aa91723-fff6-4cbf-b919-215a8c827e09',
          'name': 'Warren Mall',
          'color': 'default',
        },
        {
          'id': '99250cf2-602e-481b-a917-f5e80cdb9a91',
          'name': 'Warren Bear',
          'color': 'default',
        },
        {
          'id': 'a8fbb6e1-e61e-4682-9e08-8d8effe936a1',
          'name': 'Warren College SAC',
          'color': 'default',
        },
        {
          'id': '78454134-3659-4ca7-9125-2dbbecee879d',
          'name': 'Sixth College Lodge',
          'color': 'default',
        },
        {
          'id': '1a321e02-08ed-4ab3-8d54-0eb026c5f3f5',
          'name': 'Library Walk',
          'color': 'default',
        },
        {
          'id': '1b940d3d-4d1b-49bd-869c-1819febb4a28',
          'name': 'Design and Innovation Building 202/208',
          'color': 'gray',
        },
        {
          'id': 'fb4c37cb-346c-4b09-8379-5fc06e43f278',
          'name': 'Lecture Hall',
          'color': 'gray',
        },
        {
          'id': 'b8cc853b-f740-4403-8c7b-e6d4a77276c0',
          'name': 'Off Campus',
          'color': 'pink',
        },
        {
          'id': 'a29b7a28-9e55-4ca5-baad-58f45a5d2984',
          'name': 'Other (See Details)',
          'color': 'gray',
        },
        {
          'id': 'a323da05-b7e3-4fdd-b8df-6b86c543f209',
          'name': 'CSE B225 (Fishbowl)',
          'color': 'default',
        },
        {
          'id': 'c1173e0b-03db-428f-a3cb-6abb2326e929',
          'name': 'PC Bear Room',
          'color': 'default',
        },
        {
          'id': 'f937d411-cdab-4f54-b1c6-29944a662477',
          'name': 'Student Services Center Conference Room',
          'color': 'gray',
        },
        {
          'id': 'd3ee38e3-d476-42c9-b34a-0641c2727047',
          'name': 'PC Forum',
          'color': 'brown',
        },
      ],
    },
  },
  'Booking Time': {
    'id': 'H%3F%5DX',
    'name': 'Booking Time',
    'type': 'date',
    'date': {},
  },
  'Recording Requests': {
    'id': 'LYO%3D',
    'name': 'Recording Requests',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Invoice (Food)': {
    'id': 'ReRE',
    'name': 'Invoice (Food)',
    'type': 'files',
    'files': {},
  },
  'Event Coordinator': {
    'id': 'TC0%24',
    'name': 'Event Coordinator',
    'type': 'people',
    'people': {},
  },
  'YouTube Thumbnail': {
    'id': 'UXt%5D',
    'name': 'YouTube Thumbnail',
    'type': 'files',
    'files': {},
  },
  'Check-in Code': {
    'id': 'VP1y',
    'name': 'Check-in Code',
    'type': 'rich_text',
    'rich_text': {},
  },
  'FB CoHost': {
    'id': 'WB%60S',
    'name': 'FB CoHost',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Recording': {
    'id': 'XH%5EO',
    'name': 'Recording',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '6a9b2cea-ab53-4c0f-8e9c-b97a5b19e178',
          'name': 'Yes',
          'color': 'default',
        },
        {
          'id': '8e1401c4-2a32-4372-ba63-65e8916f0d18',
          'name': 'No',
          'color': 'green',
        },
      ],
    },
  },
  'Booking Status': {
    'id': 'X%5E%5BG',
    'name': 'Booking Status',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '733e89dc-e63c-4340-b773-23288ceeaf00',
          'name': 'Booking N/A',
          'color': 'default',
        },
        {
          'id': 'cacd21cb-0852-4e4a-80e1-5310246337d8',
          'name': 'Booking TODO',
          'color': 'orange',
        },
        {
          'id': 'c5e35290-36b7-4900-b6e6-a609ab0a10f4',
          'name': 'Booking In Progress',
          'color': 'yellow',
        },
        {
          'id': '1f190ba0-b47a-4e0e-bae4-c65e01c15fdd',
          'name': 'Booking Completed',
          'color': 'green',
        },
        {
          'id': '6a1a9bca-6d47-4d79-b1f3-c7651353505d',
          'name': 'Booking CANCELLED',
          'color': 'red',
        },
      ],
    },
  },
  'Organizations': {
    'id': '%5B9%5Ba',
    'name': 'Organizations',
    'type': 'multi_select',
    'multi_select': {
      'options': [
        {
          'id': '079df246-e630-438e-9a5d-a9e17d8a819d',
          'name': 'ACM General',
          'color': 'blue',
        },
        {
          'id': 'bc88bab4-fe15-422b-bd06-dc87fbeb98b2',
          'name': 'ACM AI',
          'color': 'red',
        },
        {
          'id': '85c859fe-faa9-4eff-9d5e-242117dbe363',
          'name': 'ACM Cyber',
          'color': 'green',
        },
        {
          'id': 'bc303ba8-67e4-46f1-955e-c0b0a14ff525',
          'name': 'ACM Design',
          'color': 'pink',
        },
        {
          'id': 'ae517783-51d9-4768-bf56-ba6d22a4142b',
          'name': 'ACM Hack',
          'color': 'orange',
        },
        {
          'id': '6032738c-8917-4e82-b4e4-29934019f574',
          'name': 'ACM Innovate',
          'color': 'purple',
        },
        {
          'id': 'a8db934a-db31-4355-838e-2d41cf7c1d11',
          'name': 'TSE',
          'color': 'default',
        },
        {
          'id': '0a471a0a-c127-4666-b68c-5c2a32271f49',
          'name': 'TESC',
          'color': 'default',
        },
        {
          'id': '2910b5e8-b7ff-4f7f-b20a-8446c6fd53f9',
          'name': 'IEEE',
          'color': 'default',
        },
        {
          'id': 'e505a396-8d36-4405-9581-90d0b20127fe',
          'name': 'WIC',
          'color': 'default',
        },
        {
          'id': 'e16441ea-fe04-4ba8-b4de-9deab07a7f65',
          'name': 'HKN',
          'color': 'default',
        },
        {
          'id': 'eab04cd4-a338-43d4-81d1-b59a14590c24',
          'name': 'DS3',
          'color': 'default',
        },
        {
          'id': 'af4dd781-d453-40b8-8abd-319e0796ee45',
          'name': 'EDGE',
          'color': 'default',
        },
        {
          'id': '06351ff3-cf38-45f7-bca3-c4926ee0996f',
          'name': 'PIB',
          'color': 'default',
        },
        {
          'id': 'b89b5424-d863-4862-8513-2344768fe1fb',
          'name': 'ECE UCSD',
          'color': 'default',
        },
        {
          'id': '65e0bcf5-e919-49da-afbe-8353911c520e',
          'name': 'ECE USC',
          'color': 'default',
        },
        {
          'id': '552e9715-b7d0-41dd-a1e6-72b7652fd362',
          'name': 'Tau Beta Pi',
          'color': 'default',
        },
        {
          'id': '013034fb-1d3b-4b57-9c03-a8c07b541c8c',
          'name': 'QC',
          'color': 'default',
        },
        {
          'id': '29f07943-da25-4569-9ac2-6c4f3d6eec6f',
          'name': 'SASE',
          'color': 'default',
        },
        {
          'id': '1f13c982-8b9b-4e74-b02c-ef35240f0d33',
          'name': 'Contrary Capital',
          'color': 'default',
        },
        {
          'id': '9a969d21-dd41-40ff-81a4-32830ed4079c',
          'name': 'Phi Beta Lambda',
          'color': 'default',
        },
        {
          'id': 'f60a92a5-0e77-4a59-841b-d7b55ca916f6',
          'name': 'Quantum Computing at UCSD',
          'color': 'default',
        },
        {
          'id': '964dec4b-1c89-4d16-81f0-92e604782576',
          'name': 'Girls Who Code',
          'color': 'default',
        },
        {
          'id': 'c03ded4c-1a97-4303-9ca6-24f210812393',
          'name': 'The Zone',
          'color': 'default',
        },
      ],
    },
  },
  'FB Cover Photo': {
    'id': '%5EQ7C',
    'name': 'FB Cover Photo',
    'type': 'files',
    'files': {},
  },
  'Location Backup 2': {
    'id': '%60%3DK%3A',
    'name': 'Location Backup 2',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '0f43e2c8-48ae-4ca3-9bc3-98428254f899',
          'name': 'Zoom (See Details)',
          'color': 'yellow',
        },
        {
          'id': '0b9be35f-20db-4957-aa44-6e457a2433f7',
          'name': 'Zoom Webinar (See Details)',
          'color': 'orange',
        },
        {
          'id': 'ad4d5527-56ea-415e-9eae-b1779eb5fc51',
          'name': 'Discord (See Details)',
          'color': 'blue',
        },
        {
          'id': '015cbd2b-663e-40e8-961d-a510b9a97b13',
          'name': 'Qualcomm Room',
          'color': 'default',
        },
        {
          'id': '24b079d2-bfbb-4071-8326-e0044553e9cb',
          'name': 'Henry Booker Room',
          'color': 'default',
        },
        {
          'id': '4e4a6914-6561-476d-87b9-d92091b2286b',
          'name': 'Fung Auditorium',
          'color': 'default',
        },
        {
          'id': '5c493725-ea0a-4f06-ae06-7ba3fcc8cfac',
          'name': 'CSE 1202',
          'color': 'default',
        },
        {
          'id': 'a08d8084-650d-489b-9e95-e53673fc3c6c',
          'name': 'CSE 2154',
          'color': 'default',
        },
        {
          'id': 'c4334a9b-4986-4f4f-a2e9-6604a0bcccaa',
          'name': 'CSE 4140',
          'color': 'default',
        },
        {
          'id': '6250b696-d92c-44a6-8e85-0d345f0e9319',
          'name': 'PC Eleanor Roosevelt Room',
          'color': 'default',
        },
        {
          'id': 'c9de9a14-22ac-4d78-bb31-e8f919aa6456',
          'name': 'PC Marshall Room',
          'color': 'default',
        },
        {
          'id': '4ed4f576-ace7-47c8-b5ee-90d9b6b241bd',
          'name': 'PC Warren Room',
          'color': 'default',
        },
        {
          'id': '8565ad21-c581-4d14-85a9-e5b45cb27185',
          'name': 'PC Revelle Room',
          'color': 'default',
        },
        {
          'id': 'c1410447-b3bc-4a88-a51c-682197cdbe89',
          'name': 'PC Red Shoe Room',
          'color': 'default',
        },
        {
          'id': '99a14791-be01-451f-a735-796b0138a181',
          'name': 'PC Snake Path Room',
          'color': 'default',
        },
        {
          'id': '6aee73ee-677b-47da-a547-dd98ea1d6f52',
          'name': 'PC East Ballroom',
          'color': 'default',
        },
        {
          'id': '40120553-92ef-402e-ae2a-2b9e380b15f1',
          'name': 'PC West Ballroom',
          'color': 'default',
        },
        {
          'id': 'a4b65aa3-c36c-4cc0-b765-e8ab38175948',
          'name': 'Student Services Center Multi-Purpose Room',
          'color': 'default',
        },
        {
          'id': '4aa91723-fff6-4cbf-b919-215a8c827e09',
          'name': 'Warren Mall',
          'color': 'default',
        },
        {
          'id': '99250cf2-602e-481b-a917-f5e80cdb9a91',
          'name': 'Warren Bear',
          'color': 'default',
        },
        {
          'id': 'a8fbb6e1-e61e-4682-9e08-8d8effe936a1',
          'name': 'Warren College SAC',
          'color': 'default',
        },
        {
          'id': '78454134-3659-4ca7-9125-2dbbecee879d',
          'name': 'Sixth College Lodge',
          'color': 'default',
        },
        {
          'id': 'a24a97aa-5003-4138-a2df-94750a4a9abe',
          'name': 'Multi Purpose Room',
          'color': 'default',
        },
        {
          'id': 'fcbc2e96-5248-4d6c-bfd2-ea254708e16c',
          'name': 'Design and Innovation Building 202/208',
          'color': 'gray',
        },
        {
          'id': 'fb4c37cb-346c-4b09-8379-5fc06e43f278',
          'name': 'Lecture Hall (See Details)',
          'color': 'gray',
        },
        {
          'id': 'b8cc853b-f740-4403-8c7b-e6d4a77276c0',
          'name': 'Off Campus',
          'color': 'pink',
        },
        {
          'id': 'a29b7a28-9e55-4ca5-baad-58f45a5d2984',
          'name': 'Other (See Details)',
          'color': 'gray',
        },
        {
          'id': 'de146309-42e5-45d4-845c-8b3edc1ee92d',
          'name': 'PC Muir Room',
          'color': 'green',
        },
        {
          'id': 'f6cf59a8-8167-434a-a294-393c02247a63',
          'name': 'Lecture Hall',
          'color': 'brown',
        },
        {
          'id': 'f3c92329-ed36-4749-86e3-1fbb778510f3',
          'name': 'CSE B225 (Fishbowl)',
          'color': 'red',
        },
        {
          'id': '75cae824-a17b-4817-a9a8-420ba4d07228',
          'name': 'Room 2315',
          'color': 'purple',
        },
        {
          'id': '714eb9cf-154c-4f8f-9149-34966e3ae5e8',
          'name': 'Library Walk',
          'color': 'green',
        },
        {
          'id': '59b53828-ee90-4da2-b8cb-eee538fc1f05',
          'name': 'PC Forum',
          'color': 'brown',
        },
        {
          'id': 'df72a53b-0b84-4d92-8cdc-95904c095585',
          'name': 'PC Bear Room',
          'color': 'blue',
        },
      ],
    },
  },
  'CSI Form Status': {
    'id': 'a%5D%60Q',
    'name': 'CSI Form Status',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '58d07f44-d459-4e58-b314-b560f9dc8a09',
          'name': 'CSI Form N/A',
          'color': 'default',
        },
        {
          'id': '934c6575-fc3e-47f1-87e3-36ee8bb7359a',
          'name': 'CSI Form TODO',
          'color': 'orange',
        },
        {
          'id': '34845e13-081a-4217-b11e-e060a7307b31',
          'name': 'CSI Form In Progress',
          'color': 'yellow',
        },
        {
          'id': '8d0c272a-83e0-40f6-ad49-ff29377bc39d',
          'name': 'CSI Form Done',
          'color': 'green',
        },
      ],
    },
  },
  'Projected Attendance': {
    'id': 'b%5D%5Dq',
    'name': 'Projected Attendance',
    'type': 'number',
    'number': {
      'format': 'number',
    },
  },
  'Food Pickup Time': {
    'id': 'b%5DyD',
    'name': 'Food Pickup Time',
    'type': 'date',
    'date': {},
  },
  'Location URL': {
    'id': 'cjEL',
    'name': 'Location URL',
    'type': 'url',
    'url': {},
  },
  'YouTube Link': {
    'id': 'cv%5DX',
    'name': 'YouTube Link',
    'type': 'url',
    'url': {},
  },
  'PR Requests': {
    'id': 'ec~7',
    'name': 'PR Requests',
    'type': 'rich_text',
    'rich_text': {},
  },
  'AS Funding Attendance': {
    'id': 'g%3Bvm',
    'name': 'AS Funding Attendance',
    'type': 'number',
    'number': {
      'format': 'number',
    },
  },
  'AV Equipment': {
    'id': 'hYL%3D',
    'name': 'AV Equipment',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': 'ad6f5f84-1f88-4152-97f9-43f8b85c3ed5',
          'name': 'From Venue',
          'color': 'yellow',
        },
        {
          'id': '01c3ca8c-53db-4a01-abdf-4c71eba32e4c',
          'name': 'From ECE Department',
          'color': 'red',
        },
        {
          'id': 'a15a5399-ab85-4a66-ad4b-e85a957ab95e',
          'name': 'From University Centers Tech',
          'color': 'green',
        },
        {
          'id': '655870db-a8f1-4e2f-9377-b73ee7fcd989',
          'name': 'From ACM',
          'color': 'pink',
        },
        {
          'id': 'bc2d36e2-7bca-4361-9079-2fcf563780e4',
          'name': 'N/A',
          'color': 'default',
        },
      ],
    },
  },
  'Drive Link': {
    'id': "j'C%5C",
    'name': 'Drive Link',
    'type': 'url',
    'url': {},
  },
  'Projector?': {
    'id': 'jvjh',
    'name': 'Projector?',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': 'ad6f5f84-1f88-4152-97f9-43f8b85c3ed5',
          'name': 'Yes',
          'color': 'yellow',
        },
        {
          'id': '01c3ca8c-53db-4a01-abdf-4c71eba32e4c',
          'name': 'No',
          'color': 'red',
        },
      ],
    },
  },
  'Other Graphics': {
    'id': 'kFFB',
    'name': 'Other Graphics',
    'type': 'files',
    'files': {},
  },
  'Hosted by': {
    'id': 'nUi%3A',
    'name': 'Hosted by',
    'type': 'people',
    'people': {},
  },
  'Location Details': {
    'id': 'o%7DWn',
    'name': 'Location Details',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Non-food Requests': {
    'id': 'pPDg',
    'name': 'Non-food Requests',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Funding Source': {
    'id': 'qiw%5E',
    'name': 'Funding Source',
    'type': 'multi_select',
    'multi_select': {
      'options': [
        {
          'id': '8f11ea25-bd83-4062-989c-313293e4a9b1',
          'name': 'AS',
          'color': 'purple',
        },
        {
          'id': '75020878-a55b-4c1c-a40c-0a3276e351b2',
          'name': 'CSE Department',
          'color': 'yellow',
        },
        {
          'id': '2ecd45b6-9e04-40c6-b527-40e292248dfc',
          'name': 'ECE Department',
          'color': 'blue',
        },
        {
          'id': '7ba5b16b-b4f5-438b-8720-5567d1fda18f',
          'name': 'Internal',
          'color': 'pink',
        },
      ],
    },
  },
  'Event Description': {
    'id': 'r%3Dk)',
    'name': 'Event Description',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Participation Waivers': {
    'id': 'r%60ZI',
    'name': 'Participation Waivers',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': 'df00581d-0080-4727-8a08-feea425b2f93',
          'name': 'Required',
          'color': 'red',
        },
        {
          'id': 'aba6a139-a400-4afc-b554-e0b40a138928',
          'name': 'Not Required',
          'color': 'green',
        },
      ],
    },
  },
  'Booking Confirmation': {
    'id': 'rghL',
    'name': 'Booking Confirmation',
    'type': 'files',
    'files': {},
  },
  'Location Backup 1': {
    'id': 'rtZm',
    'name': 'Location Backup 1',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '0f43e2c8-48ae-4ca3-9bc3-98428254f899',
          'name': 'Zoom (See Details)',
          'color': 'yellow',
        },
        {
          'id': '0b9be35f-20db-4957-aa44-6e457a2433f7',
          'name': 'Zoom Webinar (See Details)',
          'color': 'orange',
        },
        {
          'id': 'ad4d5527-56ea-415e-9eae-b1779eb5fc51',
          'name': 'Discord (See Details)',
          'color': 'blue',
        },
        {
          'id': '015cbd2b-663e-40e8-961d-a510b9a97b13',
          'name': 'Qualcomm Room',
          'color': 'default',
        },
        {
          'id': '24b079d2-bfbb-4071-8326-e0044553e9cb',
          'name': 'Henry Booker Room',
          'color': 'default',
        },
        {
          'id': '4e4a6914-6561-476d-87b9-d92091b2286b',
          'name': 'Fung Auditorium',
          'color': 'default',
        },
        {
          'id': '5c493725-ea0a-4f06-ae06-7ba3fcc8cfac',
          'name': 'CSE 1202',
          'color': 'default',
        },
        {
          'id': 'aecd1f42-5294-4c2f-8602-e4cebfa8846c',
          'name': 'CSE 2154',
          'color': 'default',
        },
        {
          'id': '23909571-89c8-4d47-9aad-01c9d57ae4a1',
          'name': 'CSE 4140',
          'color': 'default',
        },
        {
          'id': '6250b696-d92c-44a6-8e85-0d345f0e9319',
          'name': 'PC Eleanor Roosevelt Room',
          'color': 'default',
        },
        {
          'id': 'c9de9a14-22ac-4d78-bb31-e8f919aa6456',
          'name': 'PC Marshall Room',
          'color': 'default',
        },
        {
          'id': '4ed4f576-ace7-47c8-b5ee-90d9b6b241bd',
          'name': 'PC Warren Room',
          'color': 'default',
        },
        {
          'id': '8565ad21-c581-4d14-85a9-e5b45cb27185',
          'name': 'PC Revelle Room',
          'color': 'default',
        },
        {
          'id': 'c1410447-b3bc-4a88-a51c-682197cdbe89',
          'name': 'PC Red Shoe Room',
          'color': 'default',
        },
        {
          'id': '99a14791-be01-451f-a735-796b0138a181',
          'name': 'PC Snake Path Room',
          'color': 'default',
        },
        {
          'id': '6aee73ee-677b-47da-a547-dd98ea1d6f52',
          'name': 'PC East Ballroom',
          'color': 'default',
        },
        {
          'id': '40120553-92ef-402e-ae2a-2b9e380b15f1',
          'name': 'PC West Ballroom',
          'color': 'default',
        },
        {
          'id': 'a4b65aa3-c36c-4cc0-b765-e8ab38175948',
          'name': 'Student Services Center Multi-Purpose Room',
          'color': 'default',
        },
        {
          'id': '4aa91723-fff6-4cbf-b919-215a8c827e09',
          'name': 'Warren Mall',
          'color': 'default',
        },
        {
          'id': '99250cf2-602e-481b-a917-f5e80cdb9a91',
          'name': 'Warren Bear',
          'color': 'default',
        },
        {
          'id': 'a8fbb6e1-e61e-4682-9e08-8d8effe936a1',
          'name': 'Warren College SAC',
          'color': 'default',
        },
        {
          'id': '78454134-3659-4ca7-9125-2dbbecee879d',
          'name': 'Sixth College Lodge',
          'color': 'default',
        },
        {
          'id': '62606abb-4b3e-4218-af53-2c7a0228707b',
          'name': 'Design and Innovation Building 202/208',
          'color': 'gray',
        },
        {
          'id': 'b0ad2acb-fbd6-4035-a335-864fd6f65231',
          'name': 'Student Services Center',
          'color': 'default',
        },
        {
          'id': 'fb4c37cb-346c-4b09-8379-5fc06e43f278',
          'name': 'Lecture Hall (See Details)',
          'color': 'gray',
        },
        {
          'id': 'b8cc853b-f740-4403-8c7b-e6d4a77276c0',
          'name': 'Off Campus',
          'color': 'pink',
        },
        {
          'id': 'a29b7a28-9e55-4ca5-baad-58f45a5d2984',
          'name': 'Other (See Details)',
          'color': 'gray',
        },
        {
          'id': 'a5193d10-1beb-41b3-9361-850518e29771',
          'name': 'PC Forum',
          'color': 'red',
        },
        {
          'id': '45adb9d1-1be2-409a-8870-6690263fa84f',
          'name': 'PC Bear Room',
          'color': 'green',
        },
        {
          'id': '5041336b-b204-43e2-9e73-1a9173bd0a59',
          'name': 'PC Muir Room',
          'color': 'purple',
        },
        {
          'id': 'c4aa2b6a-b7ca-477d-bfee-3301d18de2d8',
          'name': 'CSE B225 (Fishbowl)',
          'color': 'brown',
        },
        {
          'id': '172e6eee-141a-4e1d-af70-8cbb1b1de458',
          'name': 'Room 2315',
          'color': 'gray',
        },
        {
          'id': '498918df-84bd-4403-abbd-77402c3ad391',
          'name': 'Library Walk',
          'color': 'brown',
        },
        {
          'id': 'b35c7568-a863-4dca-a5b1-1b99246392ef',
          'name': 'Lecture Hall',
          'color': 'purple',
        },
      ],
    },
  },
  'PR Manager': {
    'id': 't%5B%5CH',
    'name': 'PR Manager',
    'type': 'people',
    'people': {},
  },
  'Date': {
    'id': 'u!%26I',
    'name': 'Date',
    'type': 'date',
    'date': {},
  },
  'Requested Items': {
    'id': 'u7pc',
    'name': 'Requested Items',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Food Pickup Details': {
    'id': 'w%5CvE',
    'name': 'Food Pickup Details',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Upload to Youtube?': {
    'id': 'yW_J',
    'name': 'Upload to Youtube?',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': '03e4a544-192d-46b5-b710-518b03821730',
          'name': 'Yes I would like the Events team to handle the all aspects of recording for my event',
          'color': 'blue',
        },
        {
          'id': 'a9c8ca5b-43cf-4582-b68d-39f790818062',
          'name': 'Yes but I will record it myself and send the Events team a link',
          'color': 'gray',
        },
        {
          'id': '8edcafae-ea12-4411-953e-ff13a1d4aaad',
          'name': 'Yes and I will upload it to the ACM YouTube channel myself',
          'color': 'yellow',
        },
        {
          'id': '8b10b1e5-929c-41ee-b718-b8a9d0acb578',
          'name': 'No I do not want anything uploaded to YouTube',
          'color': 'orange',
        },
      ],
    },
  },
  'FB ACMURL': {
    'id': 'znBJ',
    'name': 'FB ACMURL',
    'type': 'url',
    'url': {},
  },
  'Date/Time Notes': {
    'id': '~JH%3F',
    'name': 'Date/Time Notes',
    'type': 'rich_text',
    'rich_text': {},
  },
  'Historian Onsite': {
    'id': '~%5CKw',
    'name': 'Historian Onsite',
    'type': 'people',
    'people': {},
  },
  'Sponsor?': {
    'id': '~y%40%5D',
    'name': 'Sponsor?',
    'type': 'select',
    'select': {
      'options': [
        {
          'id': 'e46012df-0bdd-4aba-bee8-b7b901108601',
          'name': 'Yes',
          'color': 'green',
        },
        {
          'id': '5da9aea8-4789-47a4-bf3d-5406e87318be',
          'name': 'No',
          'color': 'blue',
        },
      ],
    },
  },
  'Name': {
    'id': 'title',
    'name': 'Name',
    'type': 'title',
    'title': {},
  },
};