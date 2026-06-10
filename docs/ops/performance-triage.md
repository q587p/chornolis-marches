# Performance Triage Guide

Use this guide after a deploy when Chornolis feels slow and the next tuning
step is not obvious. The goal is evidence first: collect a short set of runtime
snapshots, compare them with slow logs, and choose one narrow follow-up PR.

Do not tune blindly. Do not change queue ordering, creature backpressure,
recovery scans, Telegram delivery, database queries or indexes from intuition
alone when the current telemetry can identify the hotter path.

## Short Live Validation

Run this for 10-15 minutes during a quiet maintenance window or a controlled
live smoke with one maintainer clicking quickly.

1. Temporarily lower useful thresholds if production noise is acceptable:

   ```text
   SLOW_COMMAND_LOG_MS=100
   ACTION_COMPLETION_SLOW_MS=100
   TELEGRAM_SEND_SLOW_MS=100
   DATABASE_QUERY_SLOW_MS=100
   ```

   Normal production values can stay higher. If these thresholds are too noisy
   on the live service, keep production values and rely more on the guarded
   runtime snapshots.

2. Run `/queueDebug` and capture the guarded queue snapshot while the service is
   idle.
3. Click quick repeated player actions for a short burst, especially tracking:
   `/track` / `Сліди`.
4. Run `/queueDebug` again while the repeated actions are still active or just
   after they were queued.
5. Wait for the backlog to drain, then run `/queueDebug` a third time.
6. Save matching slow-log excerpts around the same window.

The three snapshots should be:

- idle baseline;
- active repeated-action sample;
- after-drain sample.

Use `docs/ops/performance-observation-template.md` to paste the raw snapshots
without over-editing them.

For a quick local read of a pasted snapshot, the pure helper
`summarizeQueueDebugText(...)` in `src/utils/queueDebugAnalysis.ts` can extract
the headline counts and suggest a first PR category. It does not call the
database, does not require Telegram and should not replace the three-snapshot
evidence pass.

## Logs To Check

Look for these labels in the same time window:

- `slow:actionQueue.process`;
- `slow:recoveryLoop.pass`;
- `slow:actionCompletion`;
- `slow:telegramSend`;
- `slow:databaseQuery`.

The labels are only a map, not the conclusion. Match them against the snapshot
sections before deciding what to tune.

## Decision Tree

If `playerCompleteMs` is high and `completionSlow` / `recentSlowCompletions`
also shows slow or errored completions, inspect the action type first. The next
PR should usually be action-specific optimization or narrower completion-side
analysis.

If `creatureCompleteMs` is high while player actions remain overdue, inspect the
creature queue mode and reason. Tune creature backpressure only if players stay
delayed under creature pressure; do not widen or pause creature work just
because the creature queue is large.

If recovery `playersMs` or `creaturesMs` is high, inspect recovery counts before
changing cadence. The next PR should usually prune recovery candidates or split
side effects, not shorten the recovery interval.

If Telegram send durations are high, inspect `telegramSend`,
`recentSlowTelegramSends` and `recentTelegramSendErrors`. The next PR should
reduce awaited fan-out or defer only safe follow-ups. Do not move primary action
results, safety warnings, admin replies or critical failure replies into
best-effort delivery.

If database query durations are high, inspect `databaseQuery`,
`recentSlowDatabaseQueries` and `recentDatabaseQueryErrors`. Identify the
model/action samples first, then propose a query/index PR only for the repeated
hot path.

If deferred follow-up pending, dropped, expired or error counts are high, decide
whether the items are genuinely optional. The next PR can tune deferred queue
limits or move a message back to awaited delivery if it is actually critical.

If the snapshots show no strong signal, collect another controlled window
before making a tuning PR. Several small weak signals are not a reason to
bundle database, Telegram, recovery and backpressure changes together.

## Next PR Types

After the evidence pass, choose one:

- database/index/query tuning;
- recovery pruning;
- Telegram delivery or deferred-follow-up tuning;
- creature backpressure threshold tuning;
- action-specific optimization.

Do not implement several categories at once unless the same snapshots clearly
show they are the same bottleneck.
