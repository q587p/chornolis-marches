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
```

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
