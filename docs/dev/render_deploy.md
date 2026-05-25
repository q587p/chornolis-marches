# Render Deployment

Recommended build command:

```bash
npm install && npx prisma migrate deploy && npm run build && npm run seed
```

`npm run seed` uses bounded parallel database writes. The default `SEED_CONCURRENCY` is `12`; lower it if the database is under pressure, or raise it cautiously for a nearby/local database.

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
