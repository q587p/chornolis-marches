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

`npm test` reads its ordered command list from `scripts/test/test-manifest.cjs`
through `scripts/test/run-tests.cjs`. When adding a new focused test, add it to
that manifest in the intended order instead of expanding `package.json`.
The runner prints per-command durations and a slowest-command summary. It runs
serially by default; use `TEST_JOBS` for a faster local pass when the machine can
handle concurrent Node processes:

```bash
TEST_JOBS=4 npm test
```

On Windows PowerShell:

```powershell
$env:TEST_JOBS=4; npm.cmd test
```

The runner clamps `TEST_JOBS` to a small positive range and preserves the
manifest order in command labels and the final slowest list. Test subprocesses
default to `TS_NODE_TRANSPILE_ONLY=1`; the manifest still runs
`tsc -p tsconfig.seed.json`, and CI runs `npm run typecheck`, so type coverage
stays explicit.

Check that the current database has the seeded start location and map basics:

```bash
npm run test:db
```

## Notes

- Only one bot instance can run at a time because Telegram polling allows one active poller.
- Database migrations are required before deploy.
- `npm run seed` seeds world structure, resources, species, lifecycle profiles and unique NPCs.
