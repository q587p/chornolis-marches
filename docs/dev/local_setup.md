# Local Setup

```bash
npm install
```

Create `.env`:

```env
BOT_TOKEN=...
DATABASE_URL=...
PUBLIC_BASE_URL=http://localhost:3000
WORLD_TICK_INTERVAL_MS=1500
ADMIN_SET_SECRET=...
```

`WORLD_TICK_INTERVAL_MS` is the main boot-time timing knob for world ticks, action durations, regeneration and track TTL. `TICK_MS` is a legacy alias used only when `WORLD_TICK_INTERVAL_MS` is absent.

`ADMIN_SET_SECRET` is a local-only secret for the hidden `/adminSet <secret>` command. It grants the current player the `Писар Порубіжжя` role in the database. Keep the same value in local `.env` and in Render environment variables; do not commit the secret.

Run migrations and seed:

```bash
npx prisma migrate deploy
npm run seed
npm run build
npm run dev
```

`npm run seed` uses bounded parallel database writes. Override the default if needed:

```bash
SEED_CONCURRENCY=8 npm run seed
```

Check the static world seed data:

```bash
npm test
```

Check that the current database has the seeded start location and map basics:

```bash
npm run test:db
```

## Notes

- Only one bot instance can run at a time because Telegram polling allows one active poller.
- Database migrations are required before deploy.
- `npm run seed` seeds world structure, resources, species, lifecycle profiles and unique NPCs.
