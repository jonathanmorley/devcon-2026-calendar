# AI DevCon NYC 2026 calendar

An iCalendar feed of the [AI DevCon NYC 2026](https://tessl.io/devcon#agenda) schedule (2 to 4 November 2026, Industry City, Brooklyn), regenerated hourly from the Sessionize data the conference site uses.

## Subscribe

Add this URL as a calendar subscription (not an import, or it will not update):

```
https://raw.githubusercontent.com/jonathanmorley/devcon-2026-calendar/main/devcon-2026.ics
```

- **Apple Calendar:** File → New Calendar Subscription, paste the URL.
- **Google Calendar:** Other calendars → + → From URL, paste the URL.
- **Outlook:** Add calendar → Subscribe from web, paste the URL.

Every session is an event, with the room as the location and speakers, track and abstract in the description. Breaks, lunch and the party are included. Times are Eastern.

## How it updates

`build.mjs` fetches the Sessionize `GridSmart` view and writes `devcon-2026.ics`. The [workflow](.github/workflows/update.yml) runs it every hour and commits only when the output changes. Calendar apps poll subscriptions on their own schedule, typically every few hours, so changes appear within a few hours of Sessionize.

Run it locally with `node build.mjs` (Node 20 or newer, no dependencies).
