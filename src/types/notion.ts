import { GetUserResponse } from "@notionhq/client/build/src/api-endpoints";

export type NotionUser = GetUserResponse;

export type EventLocation = "Zoom (See Details)"
| "Zoom Webinar (See Details)"
| "Discord (See Details)"
| "Qualcomm Room"
| "Henry Booker Room"
| "Fung Auditorium"
| "CSE 1202"
| "PC Eleanor Roosevelt Room"
| "PC Marshall Room"
| "PC Muir College Room"
| "PC Warren Room"
| "PC Revelle Room"
| "PC Red Shoe Room"
| "PC Snake Path Room"
| "PC East Ballroom"
| "PC West Ballroom"
| "Multi-Purpose Room"
| "Warren Mall"
| "Warren Bear"
| "Warren College SAC"
| "Sixth College Lodge"
| "Library Walk"
| "Lecture Hall (See Details)"
| "Off Campus"
| "Other (See Details)";