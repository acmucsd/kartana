# Kartana

Kartana is ACM UCSD Board's virtual assistant for various tasks related to the
management of Board's tasks.

Current functions include automatically importing new events to our internal Notion
for logistical management.

# Functions

Kartana does a few things, but here are the highlights.

## Notion Events Pipeline

Kartana can synchronize the responses sent to our Events Host Form
(https://acmurl.com/host) to our private board Notion Events calendar.

Kartana does so by:
- reading the Google Sheets responses and finding those that have not been
  imported yet
- forming a Notion card that can be added to the Notion Calendar base
- creating the Notion card on the calendar
- sending a notification to Events team that something new has been added
  through Discord.

# Usage

Fill the `.env.example` file with the necessary credentials and URL's and save it
as `.env`. Check the comments in the file for details. If you need any help
acquiring the credentials in the `.env.example` file, consult the `SECURITY.md`
file for details, along with the other docs for any specific pipeline to configure.

Kartana can be run using:
```sh
yarn start
```

# Credits

Thanks to:
- Nishant Balaji for busting my ass so I can actually finish this thing
  sometime this year.
- Notion for at least _providing_ an API
- Bryce Tsuyuki for guiding me through the business logic of the Host Form
- Kristina "Kat" Diep for helping me come up with a name for Kartana