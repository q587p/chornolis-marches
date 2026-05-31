# Render Deployment

Recommended build command:

```bash
npm install && npx prisma migrate deploy && npm run build && npm run seed
```

`npm run seed` uses bounded parallel database writes. The default `SEED_CONCURRENCY` is `12`; lower it if the database is under pressure, or raise it cautiously for a nearby/local database.

Session presence uses `AUTO_AFK_AFTER_MINUTES` for the silent inactivity timeout. It defaults to `15`; tests or local runs may override it. `AUTO_AFK_CHECK_INTERVAL_MS` defaults to `60000` and controls how often the worker checks for players to mark AFK.

## Pre-deploy checklist

Use this before committing or pushing a release patch.

1. Run tests:

   ```bash
   npm test
   ```

   This checks static world seed data and type-checks `prisma/seed.ts` without writing to the database.

2. Check whether a migration is needed:

   - Needed when `prisma/schema.prisma` changes in a way that alters tables, columns, indexes, enums or relations.
   - Needed when runtime code expects a new persisted field, such as a new counter on `Player` or `Creature`.
   - Not needed for TypeScript-only logic, docs, `news.md`, balancing constants, `/stat` formatting or seed data that uses existing columns.

3. Check whether `npm run seed` is needed after deploy:

   - Needed when `prisma/data/world/**`, `prisma/seed.ts` or shared seed data such as `src/data/starterAnimals.ts` changes.
   - Needed when species defaults, starter creatures, authored locations, exits, features, resource nodes or unique NPC seed definitions change.
   - Usually not needed for pure runtime behavior such as combat logic, tick logic, Telegram handlers or display-only `/stat` changes.
   - For local experiments, `/reset` can refresh runtime world state, but it is not a replacement for production seed data after deploy.

4. Deploy order:

   ```bash
   npx prisma migrate deploy
   npm run build
   npm run seed
   npm run test:db
   ```

   On Render this can stay combined in the build command, but when doing it manually keep this order: schema first, compiled app second, authored data third, smoke check last.

5. Release-note hygiene:

   - `CHANGELOG.md` should describe player-visible, admin-visible or operationally meaningful changes. Public `news.md` should describe player-visible changes and should not include scribe/admin-only commands, hidden service URLs, secrets or debug-only tooling.
   - Do not add bookkeeping-only bullets such as "Bumped package metadata to x.y.z", "Added release notes for x.y.z", or "Updated news/changelog".
   - Version bumps, release-note files and documentation bookkeeping can stay in the commit diff; they do not need their own changelog/news bullets unless they change behavior or workflow.

6. PR hygiene:

   - Work from a separate branch and open a PR into `main`.
   - Include summary, checks/validation and risks or rollback notes in the PR description.
   - For docs-only or planning-only releases, state that runtime risk is expected to be low and that no deploy seed/migration is needed unless data files changed.

Optional post-seed smoke check:

```bash
npm run test:db
```

This verifies that the configured database contains the current `meta.startLocationKey` location and basic map tables.

## Status endpoints

Render Web Service exposes:

- `/` — public Ukrainian status and project overview page with `запущено`, version, shared active-character `/who` count, navigation links, emblem, vision and tone.
- `/world` — protected service status page with world counts, action queue diagnostics and latest events; asks for `ADMIN_SET_SECRET`.
- `/all` — protected service view of `/all`; asks for `ADMIN_SET_SECRET` before showing the list.
- `/health` — JSON health check.
- `/who` — public active-character list with pagination (`?page=0`).
- `/who.json` — JSON active-character list page and shared public count (`?page=0`).
- `/stat` — protected human-readable statistics page; asks for `ADMIN_SET_SECRET`.
- `/stat.json` — protected JSON statistics; requires the same admin cookie as `/stat`.

Start command:

```bash
npm start
```

## Environment variables

Required:

- `BOT_TOKEN` — Telegram bot token.
- `DATABASE_URL` — PostgreSQL connection string.

Optional:

- `PORT` — HTTP status server port. Defaults to `3000`.
- `PUBLIC_BASE_URL` — public web base URL used in Telegram links. Defaults to `https://chornolis-marches.onrender.com`.
- `ADMIN_SET_SECRET` — secret for the hidden `/adminSet <secret>` Telegram command that grants the current character the `Писар Порубіжжя` role. Store it only in Render environment variables and local `.env`.
- `WORLD_TICK_INTERVAL_MS` — primary boot-time world/action tick value. Minimum effective value is `1000` ms.
- `TICK_MS` — legacy fallback used only when `WORLD_TICK_INTERVAL_MS` is absent.
- `APP_VERSION` — fallback version label when `package.json` cannot be read.
- `SEED_CONCURRENCY` — optional seed parallelism limit. Defaults to `12`.
- `PLAYER_COMPLETION_CONCURRENCY` — optional concurrency for completing due player actions. Defaults to `10`.
- `CREATURE_RUNNING_ACTION_BATCH` — optional due creature-action completion batch size. Defaults to `1000`.
- `CREATURE_COMPLETION_CONCURRENCY` — optional concurrency for completing due creature actions. Defaults to `25`.
- `WORLD_RESOURCE_REGEN_EVERY_TICKS` — optional resource-node regeneration cadence. Defaults to `160`.
- `WORLD_RESOURCE_REGEN_AMOUNT` — optional amount restored per resource regeneration tick. Defaults to `1`.
- `WORLD_GRASS_REGEN_EVERY_TICKS` — optional grass regeneration cadence. Defaults to `120`.
- `WORLD_EXHAUSTED_LOCATION_REGEN_EVERY_TICKS` — optional regeneration cadence for exhausted vegetation locations. Defaults to `720`.
- `WORLD_NATURAL_TWIGS_REGEN_INTERVAL_MS` — optional real-time cadence for slow natural `twigs` fallback in forest locations. Defaults to `7200000` (2 real hours).
- `WORLD_NATURAL_TWIGS_MAX_AMOUNT` — natural fallback cap per location. Defaults to `5`; manual/admin drops may exceed it.
- `WORLD_NATURAL_TWIGS_LOCATION_DIVISOR` — how many location slices the fallback rotates through. Defaults to `3`, meaning roughly one third of eligible forest locations per cycle.
- `WORLD_NATURAL_TWIGS_REGION_KEYS` — comma-separated region keys where natural `twigs` can appear. Defaults to `chornolis_border`.
- `WORLD_LISOVYK_WAKE_DELAY_TICKS` — optional delay between noticing region resource depletion and waking Дід лісовик. Defaults to `12`.
- `WORLD_TICK_DEBUG` — optional world tick debug logging flag.
- `WORLD_TICK_DEBUG_EVENT` — optional world tick debug event flag.
