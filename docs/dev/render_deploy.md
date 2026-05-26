# Render Deployment

Recommended build command:

```bash
npm install && npx prisma migrate deploy && npm run build && npm run seed
```

`npm run seed` uses bounded parallel database writes. The default `SEED_CONCURRENCY` is `12`; lower it if the database is under pressure, or raise it cautiously for a nearby/local database.

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

   - `CHANGELOG.md` and `news.md` should describe player-visible, admin-visible or operationally meaningful changes.
   - Do not add bookkeeping-only bullets such as "Bumped package metadata to x.y.z", "Added release notes for x.y.z", or "Updated news/changelog".
   - Version bumps, release-note files and documentation bookkeeping can stay in the commit diff; they do not need their own changelog/news bullets unless they change behavior or workflow.

Optional post-seed smoke check:

```bash
npm run test:db
```

This verifies that the configured database contains the current `meta.startLocationKey` location and basic map tables.

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
- `WORLD_TICK_INTERVAL_MS` — primary boot-time world/action tick value. Minimum effective value is `1000` ms.
- `TICK_MS` — legacy fallback used only when `WORLD_TICK_INTERVAL_MS` is absent.
- `APP_VERSION` — fallback version label when `package.json` cannot be read.
- `SEED_CONCURRENCY` — optional seed parallelism limit. Defaults to `12`.

Currently not wired in `src/config.ts`:

- `WORLD_RESOURCE_REGEN_AMOUNT`;
- `WORLD_TICK_DEBUG`;
- `WORLD_TICK_DEBUG_EVENT`.

If these are present in Render today, they are notes/placeholders until the code explicitly reads them.
