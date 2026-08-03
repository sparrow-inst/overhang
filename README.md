# The Overhang 2026

Splash site for [The Overhang](https://luma.com/overhang26) — a two-day DC
conference by Sparrow Institute. Next.js 15 + TypeScript on Bun, deployed on
Vercel.

## Develop

```sh
bun install
cp .env.example .env   # fill in LUMA_API_KEY
bun run dev
```

## Environment variables

| Name | Value |
| --- | --- |
| `LUMA_API_KEY` | from luma.com/calendar/manage/api-keys, scoped to the Sparrow Institute DC calendar |
| `LUMA_EVENT_ID` | optional; defaults to `evt-nwu5co94KFZux5y` |

The key grants full access to the calendar it's scoped to — it is only ever
read server-side (`src/lib/luma.ts`, `/api/tickets`). Don't prefix it with
`NEXT_PUBLIC_`.

## How it's put together

- **Topo background** — `src/lib/topo.ts`, a WebGL2 terrain with CPU
  hydrology and feature labels, ported from the design playground. Animation
  params are locked in `PARAMS`; day and night render the same world.
- **Theme** — `data-theme` on `<html>`, CSS variables in
  `src/app/globals.css`. Stored preference wins, else OS color scheme.
- **Event info** — date/time/location pulled from the Luma API server-side,
  revalidated every 5 minutes, with baked fallbacks.
- **Tickets** — `/api/tickets` proxies Luma (edge-cached 5 min,
  stale-while-revalidate 1 h). Checkout happens on luma.com; the selected
  tier is preselected via `?tt=`.
- **Speakers** — placeholder data in `src/data/speakers.json`, shaped
  (name, subtitle, photoUrl) for the future Airtable source.

## Freshness

Ticket/tier changes in Luma appear within ~5 minutes with no rebuild. For
instant updates, point a Luma `event.updated` webhook at a Vercel Deploy
Hook.
