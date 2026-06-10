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

Labels describe code paths such as learning lookup, target inspection, tracking,
the action queue pass, individual action completions, the separate recovery
pass, follow-route memory, or `followAssist.catchUp` after a completed move.
They must not include private player message text, Telegram payloads, whispers,
direct replies, tokens or database secrets. Use these logs to identify remaining
hotspots before rewriting WorldEvent marker storage or adding broader indexes.

`slow:actionQueue.process` and `slow:recoveryLoop.pass` should be watched
together when checking responsiveness. The action queue should finish due
actions without waiting for the full stamina/HP recovery scan; recovery runs on
`RECOVERY_POLL_MS`, defaulting to 5000 ms.

As of `0.16.23`, individual completed player/creature actions also record a
small sanitized runtime sample. `slow:actionCompletion` appears only for slow
completions or completion errors and includes action id, actor type, player or
creature id, action type, duration, overdue age and outcome. It intentionally
does not log raw action payload JSON, Telegram chat ids, private text, whispers
or secrets. `ACTION_COMPLETION_SLOW_MS` can override the threshold for this
path; otherwise it follows `SLOW_COMMAND_LOG_MS` and defaults to `1000`.
`ACTION_COMPLETION_SAMPLE_LIMIT` controls how many recent slow/error samples
guarded `/queueDebug` keeps, defaulting to `10` and capped at `50`.

As of `0.16.24`, Telegram `sendMessage` calls through `safeSendMessage` also
record sanitized runtime samples. `slow:telegramSend` appears only for slow or
failed sends and includes a developer-chosen context label, duration, outcome
and compact sanitized error text. It intentionally does not log chat ids,
usernames, message text, payloads, raw Telegram responses, parse-mode content,
player speech, whispers, tokens or secrets. `TELEGRAM_SEND_SLOW_MS` can
override the threshold for this path; otherwise it follows `SLOW_COMMAND_LOG_MS`
and defaults to `1000`. `TELEGRAM_SEND_SAMPLE_LIMIT` controls how many recent
slow/error samples guarded `/queueDebug` keeps, defaulting to `10` and capped at
`50`.

As of `0.16.25`, selected direct action completion, recovery and torch-fading
sends also use the same sanitized Telegram send telemetry through
`observedSendMessage`. That helper preserves direct-send delivery semantics:
success returns the Telegram message, blocked-user errors are recorded as
`blocked` and rethrown, and other send errors are recorded as `error` and
rethrown. `safeSendMessage` remains the fan-out helper that returns `null` for
blocked-user errors.

As of `0.16.26`, the main game bot also has a small in-process deferred
Telegram follow-up queue for explicitly non-critical tutorial, guidance and
recovery-extra messages. It is started only from the game bot startup path, not
from the Herald standalone service. Deferred delivery still uses
`observedSendMessage`, so Telegram send telemetry continues to show whether
latency sits in primary sends or optional follow-ups. The defaults are:

- `DEFERRED_TELEGRAM_ENABLED=true`;
- `DEFERRED_TELEGRAM_POLL_MS=250`;
- `DEFERRED_TELEGRAM_MAX_PENDING=200`;
- `DEFERRED_TELEGRAM_MAX_PER_PASS=5`;
- `DEFERRED_TELEGRAM_MAX_AGE_MS=300000`.

If the deferred queue is disabled, full, expired or delivery fails, it records
sanitized counters and does not throw back into action completion or recovery.
Do not move primary action results, safety warnings, queue-control replies,
admin replies, Herald replies or normal notification fan-out into this queue
without a focused design pass.

As of `0.16.22`, the recovery loop also records a compact runtime snapshot for
guarded `/queueDebug`: player/creature phase durations, scanned/updated player
counts, active-player skips, proactive recovery messages, creature candidates
scanned, creatures updated and active creatures refreshed. The creature recovery
phase no longer starts from every non-gone creature. It first asks for likely
candidates: creatures below base stamina, creatures with a custom `staminaMax`,
and queued/running creatures that may need `lastStaminaRegenAt` refreshed.
Player recovery math, sleep/rest behavior and creature action semantics stay
unchanged.

Guarded `/queueDebug` now also shows `completionSlow`, `recentSlowCompletions`
and `recentCompletionErrors`. Use that section when `playerCompleteMs` or
`creatureCompleteMs` is high but the pass-level timings do not show which
specific action type or actor was slow. This is observability only: Telegram
sends inside completion handlers are still awaited as before.

As of `0.16.24`, guarded `/queueDebug` also shows `telegramSend`,
`recentSlowTelegramSends` and `recentTelegramSendErrors`. Use that section when
completion timings look healthy but notification delivery or high-volume fan-out
paths are suspected. This is observability only: sends remain awaited, serial
notification loops remain serial, and blocked-user handling remains unchanged.
As of `0.16.25`, that same section also includes selected direct action
completion, recovery and torch-fading sends; direct sends still rethrow Telegram
errors exactly as before.

As of `0.16.26`, guarded `/queueDebug` also shows `deferredTelegram` and
`deferredTelegramRecent`. Use that section when primary action completion looks
healthy but optional tutorial/guidance/recovery-extra messages are lagging or
being dropped. The section shows counts and sanitized context labels only; it
must not expose chat ids, usernames, message text, payloads, parse-mode content,
player speech, whispers, tokens, secrets or raw Telegram API responses.

As of `0.16.27`, guarded `/queueDebug` also shows `databaseQuery`,
`recentSlowDatabaseQueries` and `recentDatabaseQueryErrors` for Prisma model
operations. Use that section when action completion, recovery and Telegram
delivery timings do not explain the delay and the next suspect is the shared
database layer. `slow:databaseQuery` appears only for slow or failed Prisma
model operations and includes model, action, duration, outcome and compact
sanitized error text. It intentionally does not log query arguments, SQL,
parameters, Telegram chat ids, message text, payloads, player speech, whispers,
tokens, secrets or database URLs. `DATABASE_QUERY_OBSERVABILITY_ENABLED`
defaults to `true`. `DATABASE_QUERY_SLOW_MS` can override the threshold for this
path; otherwise it follows `SLOW_COMMAND_LOG_MS` and defaults to `100`.
`DATABASE_QUERY_SAMPLE_LIMIT` controls how many recent slow/error samples
guarded `/queueDebug` keeps, defaulting to `10` and capped at `50`.

## Action Queue Backpressure

The game bot keeps player action completion/start first. Creature queue work
runs through a conservative backpressure planner when player actions are
overdue:

- `normal` — no player overdue pressure above the threshold; creature batches
  use the normal action-lifecycle constants.
- `limited` — player actions are overdue; due creature completions continue in
  a smaller batch/concurrency and queued creature starts default to zero.
- `pause-starts` — the oldest overdue player action is past the pause-starts
  threshold; due creature completions can still proceed in the smaller batch,
  but new queued creature starts are skipped.

Default knobs:

- `CREATURE_QUEUE_BACKPRESSURE_ENABLED=true`
- `CREATURE_QUEUE_BACKPRESSURE_PLAYER_OVERDUE_MS=1000`
- `CREATURE_QUEUE_BACKPRESSURE_PAUSE_STARTS_MS=5000`
- `CREATURE_QUEUE_BACKPRESSURE_RUNNING_BATCH=50`
- `CREATURE_QUEUE_BACKPRESSURE_COMPLETION_CONCURRENCY=5`
- `CREATURE_QUEUE_BACKPRESSURE_START_BATCH=0`

This is not a cleanup or pause-all mechanism. It does not cancel, delete,
reorder or reprioritize queued creature actions; they wait for later passes.
Use guarded `/queueDebug` to inspect creature queue mode/reason, phase timings,
completed/started creature counts and skipped-start state. The admin keyboard
label for that guarded view is `🧵 Службова черга`, while the ordinary player
`/queue` surface remains separate.

## WorldEvent And Structured Markers

`WorldEvent` remains the human-readable narrative, audit and history stream:
public/history events, chronicles, visible actions and scribe-readable traces
should still be written there when the record is useful to inspect.

`WorldEventMarker` is the structured machine-readable layer for short-lived
cooldown, dedupe and state markers. It should be preferred when code only needs
to ask whether a recent marker exists for a player, creature, location, target
or context. The first hot paths moved to this table are follow-assist failure
hints, follow-assist queued-move cooldowns, mentorship lesson feedback cooldowns
and mentorship practice prompt cooldowns. These paths still keep readable
`WorldEvent` audit rows where useful.

Marker lookups are indexed by marker key plus common player, target, creature
and location fields. Avoid putting private message text, Telegram payloads or
secrets into marker metadata; use compact keys such as `skillKey`,
`resourceKey`, `reason` or `action` instead.

`slow:worldEventMarker.lookup` means a structured marker lookup crossed
`SLOW_COMMAND_LOG_MS`. If this appears repeatedly, inspect whether the marker
needs a narrower indexed field or whether too many rows are being retained.
Short-lived cooldown markers may reset across deploys for old pre-marker
`WorldEvent` rows where no fallback is kept; that is acceptable for narrow
cooldowns, but not for durable history.

`slow:followAssist.catchUp` means a post-arrival follow-assist check took longer
than the configured threshold. The usual suspects are:

- latest route-memory lookup in recent `WorldEvent` rows;
- queued/running action count for the follower;
- locked/visible exit checks;
- throttled proactive Telegram sends for assist messages or blocker hints;
- structured `WorldEventMarker` cooldown lookups for assist attempts and
  failure hints.

For a short live smoke after follow-assist changes, temporarily set
`SLOW_COMMAND_LOG_MS=500`, follow a visible target through several ordinary
exits, and watch whether repeated `slow:followAssist.catchUp` lines appear. If
that path is hot, prefer narrower structured marker fields over adding more
`description contains` lookups.

Also watch the player feel of continuous catch-up in live Telegram sessions:

- chase chains should be allowed to feel useful, but a fast-moving target should
  not drag a follower through a surprisingly long run; if this feels too long,
  tune TTL/cooldowns or add a step-count guard before considering broader group
  movement;
- manual control should win: if the follower presses another action after an
  auto-follow step, queued/running action blocking should stop the next
  catch-up from competing with the player's choice;
- route-memory lookup is bounded and does not use `description contains`; if
  `slow:followAssist.catchUp` becomes a repeated hotspot, consider a structured
  route-memory table rather than widening `WorldEvent` scans;
- AFK, ended or otherwise unavailable players should not be moved by catch-up;
  verify this with a live smoke because the code relies on the proactive-session
  guard before queueing the next assist step.

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
- `/publication_queue_status` shows the full unpublished PUBLIC outbox count,
  due-now count, future scheduled count, per-`sourceType` totals, the next
  `availableAt` overall and by source type, plus the durable pause state;
- `/future_publications` lists the next 10 unpublished PUBLIC rows scheduled for
  the future, with id, source type, source/title, archive order and Kyiv
  `availableAt`;
- `/pending_publications` is intentionally due-now only (`availableAt <= now`),
  so it can be empty while `/publication_queue_status` still reports future
  scheduled rows;
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

For rebuilding an archival channel from the deployed `news.md`, use the explicit
archive republish queue instead of `/repost_publication`:

- `/archive_republish_preview [30m]` rereads deployed `news.md`, shows total
  entries, first/last archive entry, interval, estimated finish time and whether
  a republish run is already queued;
- `/archive_republish_queue [30m]` queues the full archive oldest-first in
  `HeraldPublication` using stable `archiveOrder` and spaced `availableAt`
  values;
- `/archive_republish_status` shows pending/published republish-run rows and the
  next queued item;
- `/archive_republish_gap` compares the deployed `news.md` archive against
  visible published `NEWS_MD_ARCHIVE` / `NEWS_MD_ARCHIVE_REPUBLISH` rows,
  reports total deployed entries, visible published entries, missing entries,
  the last published archive index and the first missing index, and labels the
  result as a tail gap or internal holes;
- `/archive_republish_continue_preview 30m` previews only the missing tail
  entries after the latest visible archive publication, refusing internal holes;
- `/archive_republish_continue 30m` queues only that missing tail oldest-first
  with stable `archiveOrder`, `archive-continue:*` content hashes and normal
  archive rendering, without resuming the publisher loop;
- `/archive_republish_cancel` cancels only unpublished republish-run rows.

Archive republish rows use source type `NEWS_MD_ARCHIVE_REPUBLISH` and a
`republish:v1:*` content-hash namespace for full rebuild runs. Tail continuation
uses `archive-continue:*` hashes tied to the original archive entry, so repeated
continue commands do not duplicate already queued tail rows. Existing published
archive rows do not block the rebuild run. Channel posts render with the normal archive header,
`📜 З архіву Канцелярії`, and intentionally do not add a repeated-publication
disclaimer. Canceling the republish queue does not touch ordinary pending
`NEWS_MD` / `NEWS_MD_ARCHIVE` rows or already published history.
The gap check is read-only: it does not publish, queue, cancel or mutate
publication rows. If tail continuation rows are already queued, the gap check
still reports them as not yet visible but calls out the queued continue count.
Use it when a republish run says it has no pending rows but the deployed archive
has grown since that run was queued.
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
