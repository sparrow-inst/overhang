# Overnight build report — The Overhang 2026

Good morning! The site is **built, tested locally against the real Luma API,
and pushed to GitHub** with grouped commits. One step needs you: **Vercel**
(no credentials on this machine — details below).

## What's done

- **Repo:** https://github.com/sparrow-inst/overhang (note: the GitHub org is
  `Takeoff-DC`, not `TakeoffDC` — that org doesn't exist, so I used the one
  you're a member of).
- **Everything in the brief:** animated topo background with your locked
  params (day paper-map / night neon, same world relit), sticky header
  (mobile: menu left, wordmark center, toggle right), map-legend info card
  with tail + pulsing marker (desktop: 33% width, tail down; mobile: ~2/3
  down, tail up, wider card), speaker carousel (desktop several-wide vertical
  cards, mobile 1.2-aperture horizontal cards, arrows + dots), custom Luma
  ticket card with side-by-side tier cards, About section, footer.
- **Live data:** date/time/location and all five ticket tiers (Early Bird
  $150 → Supporter $400 + Volunteer) come from the Luma API, revalidated
  every 5 min, with baked fallbacks so nothing ever renders empty. Tier
  validity windows show as "Opens Aug 14" / "Until Aug 14" etc., and the CTA
  deep-links Luma checkout with the selected tier preselected (`?tt=`).
- **Fonts:** Fraunces (display) / Inter (body) / IBM Plex Mono (map-legend
  labels) — my pick per your "better font" note.
- **Logo:** converted the black-on-white PNG to an alpha mask
  (`public/sparrow-mask.png`) so it tints with the theme via CSS.
- Screenshots from the local prod build are in `docs/screenshots/`.

## Needs you (in order)

1. **Vercel deploy** — the CLI here has no credentials and login is an
   interactive browser flow, so I couldn't deploy. Fastest path (~2 min):
   - vercel.com → Add New → Project → import `sparrow-inst/overhang`
     (zero-config, Next.js is auto-detected; build runs fine).
   - Add env var `LUMA_API_KEY` (value is in local `.env`) for all
     environments. `LUMA_EVENT_ID` is optional (defaults to the real event).
   - Deploy. Alternatively run `vercel login` locally and tell me — I can
     take it from there.
2. **Speakers are placeholders** — per our chat I wired the carousel to
   `src/data/speakers.json` (Airtable-shaped: name, subtitle, photoUrl). I
   used obviously-historical figures (Ada Lovelace, Thomas Bayes, …) with
   generated portrait SVGs so nothing reads as a real confirmation. Swap in
   real names/photos, or point me at the Airtable when it exists.
3. **Luma `?tt=` preselect** — per the embed README this is documented for
   Luma's embed URL, not the canonical event page; if ignored it still lands
   on the event page (upside only). Worth one manual click-through after
   tickets open Aug 14.

## Nice-to-haves I noted but didn't do

- A Luma `event.updated` webhook → Vercel Deploy Hook for instant (vs 5-min)
  ticket updates.
- The "see schedule" link (card says "Schedule to come" for now, per spec).
- Real About-section photo (mockup had a DC skyline; I kept a quote card
  instead of using an image we don't have rights to).

## Notes

- No WebGL2 → the page quietly falls back to the flat theme background;
  reduced-motion users get a static render of the map.
- `.env` is gitignored; `.env.example` documents the two vars.
- Local test artifacts (Playwright etc.) live in the session scratchpad, not
  the repo.

— Claude 🐦
