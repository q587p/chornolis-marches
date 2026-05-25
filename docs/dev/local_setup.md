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
