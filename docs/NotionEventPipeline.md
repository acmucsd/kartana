# Notion Event Pipeline

This pipeline will automatically sync host form responses to the Notion Calendar
once every hour. Manual sync can be triggered by `HTTP POST` at `bot.acmucsd.com/notion/events/sync`.

A few assumptions are made about the pipeline:
- There is a sheet named "Notion Event Pipeline" in the Host Form Google Sheet with:
    - A1 column named "Imported to Notion"
    - Column filled entirely of checkboxes
    - Imported events have checkbox ticked
- Environment variables in `.env` are accurately filled
- There is at least one event in the host form response sheet
