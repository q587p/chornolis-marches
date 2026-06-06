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
- `GAME_BOT_USERNAME` — default `Chornolis_bot`, used for safe public deep links from Herald news/archive posts and the web `/news` archive to the main game bot;
- `HERALD_STARTUP_NOTICE_ENABLED`;
- `HERALD_STARTUP_NOTICE_CHAT_ID`;
- `HERALD_PUBLISH_INTERVAL_MS`;
- `HERALD_PUBLICATIONS_PAUSED` — default `false`; set `true` on Render when the Herald should wake up with automatic publication paused until `/resume_publications`;
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

## Slow Command Logs

The main game bot has small opt-in timing logs around a few high-risk command
and action paths. Set `SLOW_COMMAND_LOG_MS` to change the threshold in
milliseconds; the default is `1000`, and `0` disables these warnings.

Slow logs use the compact format:

```text
slow:<label> durationMs=<number>
```

Labels describe code paths such as learning lookup, target inspection, tracking
or follow-route memory. They must not include private player message text,
Telegram payloads, whispers, direct replies, tokens or database secrets. Use
these logs to identify remaining hotspots before rewriting WorldEvent marker
storage or adding broader indexes.

## Herald Archive Catch-Up

Historical `news.md` backfill uses the durable `HeraldPublication` outbox. The
archive queue should stay in release order: semantic-like versions such as
`0.4.0`, `0.4.1`, `0.4.2` are sorted numerically first. Explicit news dates are
used as a fallback when version sorting is not available, and source file order
is the final fallback.

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

If a backfill queued too many old posts, keep the service running and pause or
cancel the outbox instead of suspending the whole Web Service:

- `/pause_publications` stops automatic outbox publication while the Herald bot,
  health endpoint and admin commands remain alive;
- `/resume_publications` resumes automatic publication;
- `/cancel_pending_publications` and `/backfill_news_cancel` mark unpublished
  `NEWS_MD` / `NEWS_MD_ARCHIVE` rows as `CANCELED`, preserving already
  published history and leaving unrelated future publication types alone.
- `/forget_published_news confirm` deletes already published `NEWS_MD` /
  `NEWS_MD_ARCHIVE` rows from the outbox history so deployed `news.md` can be
  queued again from a clean publication book. It does not delete Telegram
  channel messages and does not touch pending rows.

Set `HERALD_PUBLICATIONS_PAUSED=true` as a Render safety rail when the outbox has
a large backlog. On startup the Herald writes the durable pause state before the
publisher tick can send due rows, so a free-service wake-up does not immediately
dump old archive posts. `/resume_publications` can resume publication at runtime.

For manual archive recovery from the deployed `news.md`, use:

- `/news_archive_list` to reread deployed `news.md`, list stable release-order
  indexes for the current file and show published/pending/canceled/missing
  counts;
- `/news_archive_find [release]` to find the current archive index for a
  release number, for example `/news_archive_find 0.4.4`;
- `/news_archive_preview [number]` to render one archive entry without posting;
- `/news_archive_post [number]` to publish exactly one selected archive entry to
  `HERALD_CHANNEL_ID`;
- `/news_archive_force_post [number]` to explicitly create a new
  archive/repost Telegram message for an archive entry by current deployed
  index;
- `/news_archive_reload` to explicitly reread deployed `news.md`.

Manual archive posting does not enqueue the full historical backlog. It uses the
same `contentHash` dedupe as the outbox and refuses to repost a selected archive
entry that is already published. Use `/news_archive_force_post [number]` only
when an admin intentionally wants a new archive/repost message from the deployed
archive index.
On Render, `news.md` is the deployed file; changing it requires commit, push and
redeploy before these commands see the new text.

Pause applies between publisher-loop sends. If a Telegram `sendMessage` call is
already in flight when pause is enabled, that send may still finish and be
marked/logged normally.

Existing publication rows from before the rendered-snapshot migration may have
no `renderedText`, but they still keep `title` and `body`. Queueing the same
`contentHash` can fill missing snapshot metadata without creating a duplicate
publication row.

Manual channel-delete and repost semantics are intentionally narrow:

- `/mark_publication_deleted` is an advisory database marker only; Telegram
  does not reliably notify the Herald about manual channel deletions, and the
  command does not delete anything in Telegram.
- `/repost_publication` creates a new Telegram message from the saved snapshot.
  It does not restore the old channel timestamp or original message id.

## Optional Herald Keepalive

`.github/workflows/herald-keepalive.yml` can ping the standalone Herald Web
Service health endpoint every 10 minutes. Set `HERALD_HEALTH_URL` in GitHub
repository Actions secrets or variables to the Herald `/health` URL, for example
`https://example.onrender.com/health`.

If `HERALD_HEALTH_URL` is absent after this workflow is on `main`, the scheduled
job will fail as a configuration reminder. That is not a game or Herald runtime
failure; either add the secret/variable, disable the schedule or ignore the
scheduled check until keepalive is wanted.

GitHub scheduled workflows run only from the default branch, so the schedule
starts only after the workflow is merged to `main`. The workflow also has
`workflow_dispatch` for manual checks.

This does not change Herald runtime behavior and does not replace the Render
service health check. It is only a keepalive ping. Keeping a Render free Web
Service awake consumes free instance hours; disable the workflow or unset
`HERALD_HEALTH_URL` when sleeping is preferred.

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
