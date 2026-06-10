# Performance Observation Template

Use this template after a short live validation window. Paste raw guarded queue
snapshots as-is where possible; trimming private chat context is fine, but avoid
summarizing the numbers by hand.

## Context

- Deployed version:
- Deploy time:
- Observation time window:
- Service:
- Who ran the smoke:

## Thresholds

```text
SLOW_COMMAND_LOG_MS=
ACTION_COMPLETION_SLOW_MS=
TELEGRAM_SEND_SLOW_MS=
DATABASE_QUERY_SLOW_MS=
```

Note any normal production values if the temporary thresholds were too noisy:

```text

```

## Load Estimate

- Active players:
- Approximate visible/relevant creatures:
- Repeated action used:
- Click pattern or manual steps:

## Idle Baseline Snapshot

Paste the idle guarded queue snapshot:

```text

```

## Active Snapshot

Paste the guarded queue snapshot while repeated actions are active or freshly
queued:

```text

```

## After-Drain Snapshot

Paste the guarded queue snapshot after the backlog drains:

```text

```

## Slow Log Excerpts

Paste matching slow-log excerpts from the same window:

```text

```

## Summary Signals

- Player overdue:
- Creature overdue:
- Slow action completions:
- Slow Telegram sends:
- Deferred follow-up pending/dropped/errors:
- Slow database model operations:
- Recovery player/creature scan pressure:

## Conclusion

What appears to be the main bottleneck?

```text

```

What evidence supports that conclusion?

```text

```

## Next Recommended PR Type

Choose one unless the evidence clearly points to one shared bottleneck:

- database/index/query tuning;
- recovery pruning;
- Telegram delivery or deferred-follow-up tuning;
- creature backpressure threshold tuning;
- action-specific optimization;
- collect another observation window first.
