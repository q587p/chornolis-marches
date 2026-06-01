---
id: HERALD-002
title: Herald outbox idempotency and locking
status: backlog
type: reliability
area: herald
priority: medium
estimate: 2-4h
tags:
  - herald
  - outbox
  - idempotency
  - locking
  - telegram
depends_on: []
---

# HERALD-002: Herald Outbox Idempotency and Locking

## Goal

Make Herald publication delivery resilient to the rare edge case where Telegram `sendMessage` succeeds but the follow-up `markPublicationPublished` database write fails.

Today that failure can leave the publication pending. A later publisher tick may then try to send the same outbox record again, which risks duplicate channel posts.

## Scope

- Audit `publishHeraldPublication`, `publishPendingHeraldPublications`, manual news posting and archive repost paths.
- Preserve existing snapshot semantics:
  - older rows created before snapshot migrations may have no `renderedText`, but they still keep `title` and `body`;
  - queueing the same `contentHash` may fill missing snapshot metadata instead of creating a duplicate row;
  - this backfill behavior is useful and should not be mistaken for an outbox bug.
- Add a stronger "publishing" / "claim" step before sending, or equivalent DB-level locking that prevents two publisher loops from sending the same pending row.
- Record enough Telegram-send evidence to recover after a post-send DB failure when practical:
  - attempted publication id;
  - timestamp;
  - Telegram message id if the process received it;
  - failure state distinct from "never sent".
- Keep manual repost (`/repost_publication`) explicitly separate from ordinary pending outbox delivery.
- Keep `/mark_publication_deleted` advisory-only: Telegram does not reliably provide a webhook/update when someone manually deletes a channel message.
- Keep `/repost_publication` explicit and duplicating by design: it creates a new Telegram message from the saved snapshot and does not restore the old timestamp or message id.
- Clarify pending-publication ordering semantics:
  - current `getPendingPublications` behavior effectively favors `availableAt`, then archive order, then `id`, which supports anti-burst archive catch-up;
  - if `priority` should remain stronger than archive order for non-archive items, document and test that distinction instead of leaving it implicit.
- Add a recovery/admin path or clear log message for "possibly sent but not marked" records.

## Guardrails

- Do not make automatic retries repost already-sent messages.
- Do not require a new service to solve this; it should work for the current standalone Herald and any future embedded mode.
- Do not lose legitimate pending publications if Telegram send fails before a message id is returned.
- Do not "fix" manual deletion markers into destructive Telegram operations unless a future task explicitly adds and verifies that behavior.
- Do not make repost pretend to be restoration of the original channel post.
- Keep public `news.md` unaffected; this is operational reliability, not player-facing news by itself.

## Acceptance

- A pending publication can be claimed atomically before send, so concurrent loops do not both publish it.
- If Telegram send succeeds and marking as published fails, the next retry does not blindly send the same row again.
- Tests or a focused fake-publisher helper cover:
  - normal publish -> published;
  - Telegram send failure -> remains retryable with error/attempt count;
  - post-send DB marking failure -> not treated as ordinary pending retry;
  - archive catch-up ordering vs non-archive priority ordering;
  - manual repost remains possible and intentionally separate.

## Notes

This is rare but worth keeping visible because Herald can run as a separate Render service and may eventually share outbox code with an embedded mode. The important part is not just retrying harder; it is making "sent but not marked" a distinct recoverable state.
