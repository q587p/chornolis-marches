# Render Services After The Herald Merge

After the Boundary Mark Chancery / Канцелярія Межового Знаку work is merged,
Chornolis uses one repository and one `main` branch, but two separate Render
services at runtime:

- the main game bot service;
- the Boundary Mark Chancery Herald service.

This keeps the codebase unified while preserving runtime isolation. The Herald
does not start the game bot, world tick, action queue, deploy announcements or
gameplay handlers. The main game service does not start the Herald unless a
future explicit embedded-mode flag is implemented and enabled.

## Repository And Branch Model

- Use one codebase: `q587p/chornolis-marches`.
- Stabilize Herald work on a feature branch, then merge it into `main`.
- After the merge, both Render services deploy from `main`.
- The services share code and migrations, but remain separate processes for now.
- Do not deploy the standalone Herald service from an old feature branch once
  the branch has merged.

## Main Game Render Service

- Branch: `main`.
- Build Command: keep the existing game build/seed flow from
  `docs/dev/render_deploy.md` unless that document is intentionally updated.
- Current expected Start Command:

```bash
node dist/bot.js
```

`npm start` is equivalent while `package.json` points to `node dist/bot.js`.

Required game env:

- `BOT_TOKEN`;
- `DATABASE_URL`;

The main game service must not require `HERALD_*` env variables. It must not
start the Herald in the current architecture. If future embedded mode is added,
it must be guarded by an explicit opt-in flag such as
`HERALD_EMBEDDED_ENABLED=true`.

## Herald Render Service

- Branch: `main`.
- Service type for the free Render MVP: Web Service.
- Build Command:

```bash
npm install && npx prisma migrate deploy && npm run build
```

- Start Command:

```bash
node dist/apps/heraldBot.js
```

Required Herald env:

- `DATABASE_URL` — currently shared with the game database so the Herald can
  read `news.md` output state, queue `HeraldPublication` rows and publish from
  the same outbox.
- `HERALD_BOT_TOKEN` — token for the Chancery bot, not the game bot.

Recommended Herald env:

- `HERALD_ENABLED`;
- `HERALD_CHANNEL_ID`;
- `HERALD_ADMIN_IDS`;
- `GAME_BOT_USERNAME` — default `Chornolis_bot`, used for safe public deep links from Herald news/archive posts to the main game bot;
- `HERALD_STARTUP_NOTICE_ENABLED`;
- `HERALD_STARTUP_NOTICE_CHAT_ID`;
- `HERALD_PUBLISH_INTERVAL_MS`;
- `HERALD_ARCHIVE_INTERVAL_MINUTES` — default `13` for historical `news.md` drip-feed spacing;
- `HERALD_MAX_PUBLICATIONS_PER_TICK` — default `1` so a sleeping free Web Service does not dump several overdue archive posts at once;
- `HERALD_REBALANCE_OVERDUE_PUBLICATIONS` — default `true` to move overdue archive posts forward after Render sleep/wake-up.

Reserved for a later implementation if needed:

- `HERALD_STARTUP_NOTICE_THREAD_ID`.

Do not add real tokens, admin ids, channel ids or private chat ids to repository
files.

## Duplicate Polling Warning

Do not run two active services with the same `HERALD_BOT_TOKEN`.

Telegram long polling expects one active poller per token. If the standalone
Herald Web Service and another process both poll the same token, Telegram may
return `409 Conflict`, startup notices may duplicate, and publisher loops may
race over the same outbox.

If future embedded mode is enabled inside the main game service:

1. Suspend or disable the standalone Herald Web Service first.
2. Copy the needed `HERALD_*` env variables to the main service.
3. Enable the explicit embedded flag.
4. Confirm logs show one Herald startup path and one publisher loop.
5. Roll back by disabling the embedded flag and re-enabling the standalone
   Herald service.

## Prisma Migration Rule

Render free Web Service has no free separate Pre-Deploy Command. Therefore the
Herald service currently runs migrations in its Build Command:

```bash
npm install && npx prisma migrate deploy && npm run build
```

Never use `prisma migrate dev` on Render. Prisma schema changes that affect
persisted database shape must include committed migrations under
`prisma/migrations/**`.

The main game service keeps its existing seed-aware deploy flow. The Herald
service should not run `npm run seed` as part of its build.

## Status Page

The game-hosted status page should list services in a useful, non-secret way:

- Основний бот / Game bot;
- Канцелярія Межового Знаку / Herald;
- Черга дій / Action queue;
- Світовий цикл / World tick.

For the Herald, the status page may show:

- runtime mode, such as `standalone`;
- last heartbeat time, if the heartbeat table has been updated;
- queued `HeraldPublication` count;
- published `HeraldPublication` count;
- latest published news time;
- latest startup time;
- a warning if the Herald has not sent a heartbeat recently.

The status page must not expose secrets, tokens, admin ids, private chat ids,
private channel ids, raw `DATABASE_URL`, queued private content, or hidden
gameplay information.

## Herald Archive Catch-Up

Historical `news.md` backfill uses the durable `HeraldPublication` outbox. The
archive queue should stay in source order: explicit news dates first when they
exist, otherwise semantic-like versions such as `0.4.0`, `0.4.1`, `0.4.2` are
sorted numerically, with source file order as the final fallback.

Render free Web Services may sleep and wake up with several archive
publications already overdue. Keep the default catch-up controls unless there is
a deliberate reason to change them:

- `HERALD_ARCHIVE_INTERVAL_MINUTES=13`;
- `HERALD_MAX_PUBLICATIONS_PER_TICK=1`;
- `HERALD_REBALANCE_OVERDUE_PUBLICATIONS=true`.

With those defaults, the Herald publishes at most one due archive item per
publisher tick and reschedules the remaining overdue archive entries to future
13-minute slots. This rule is for archive/backfill posts; manual repost commands
remain explicit admin actions.

## Icebox: Embedded Herald Mode

Possible future mode: run the Herald inside the existing main Render Web Service
as a second Telegram bot client/token.

Why it may be useful:

- fewer Render services;
- possibly lower cost or less service management.

Tradeoff:

- less runtime isolation;
- a main-service crash, deploy or config mistake can affect both the game and
  the Herald.

Requirements before implementation:

- explicit env flag, for example `HERALD_EMBEDDED_ENABLED=true`;
- standalone Herald entrypoint remains supported;
- no duplicate polling;
- no duplicate startup notices;
- no duplicate publisher loops;
- no duplicate outbox publication.

Tracked by: `HERALD-001`.
