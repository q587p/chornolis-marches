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

Check the static world seed data:

```bash
npm test
```

Check that the current database has the seeded start location and map basics:

```bash
npm run test:db
```
