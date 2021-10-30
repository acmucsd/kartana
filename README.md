# Host Form Events to Notion pipeline

This repository contains the scripts used to synchronize the responses sent to
our Events Host Form (https://acmurl.com/host) to our private board Notion
Events calendar.

This script does so by:
- reading the Google Sheets responses and finding those that have been modified
  last
- forming a Notion card that can be added to the Notion Calendar base
- creating the Notion card on the calendar
- sending a notification to Events team that something new has been added
  (Discord? Email?)

# Usage

Fill the `.env.example` file with the necessary credentials and URL's. Check
the comments for details.

This script can be run as a Docker container. By default, the sync job will run
at midnight PST every day.

# Credits

Thanks to Nishant Balaji for busting my ass so I can actually finish this thing
sometime this year.
