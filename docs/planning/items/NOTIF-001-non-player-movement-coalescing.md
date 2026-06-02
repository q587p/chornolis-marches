---
id: NOTIF-001
title: Non-player movement notification coalescing
status: testing
type: feature
area: notifications
priority: high
estimate: 3h
tags:
  - telegram
  - notifications
  - movement
  - npc
  - spirit
  - camp
---

# NOTIF-001: Non-player movement notification coalescing

## Goal

Reduce Telegram message spam from visible non-player movement, especially camp spirits and named NPCs that can move through the same location several times within a few minutes.

This is not a bug in the current inline replacement layer. It is a missing batching/coalescing layer for movement events.

## Current Behavior

Non-animal creature movement currently sends immediate departure and arrival notifications from queued `MOVE` completion:

- departure gets a `Сліди` button and clears the previous target button;
- arrival gets a target button for the arriving creature;
- close departure/arrival pairs can therefore appear as several short messages with repeated `Сліди` or stale target buttons.

Ordinary animals currently do not send these arrival/departure notifications.

## Proposed MVP

Add a short aggregation window per location for visible non-player movement notifications, roughly 30-90 seconds.

During that window, collect nearby non-player movement lines. On flush, send one compact message per location, for example:

```text
Кіт-бережник зайшов сюди знизу.
Кіт-бережник пішов звідси.
```

Attach at most one `🐾 Сліди` button at the end.

## Rules

- Player movement stays immediate.
- Hidden movement stays silent.
- Ordinary animal movement should remain quiet unless a later slice deliberately adds aggregated animal signs.
- Non-player arrival/departure events in the same location should be joined into one message when they fall inside the aggregation window.
- The flush must check session/presence guards at send time, not only when the event was queued.
- The flush must check creature state and current location before adding a target button.
- If a creature arrived and then left before the flush, keep the text lines but do not include an arrival target button.
- If multiple creatures are still present at flush, the MVP may either include target buttons for currently present named/spirit/NPC creatures or include only `Сліди`; never include stale target buttons.
- Use one `Сліди` button, not one per movement line.
- Use existing inline replacement keys or an equivalent cleanup path so old target/track buttons do not remain misleading.

## Acceptance

- Two or more non-player movement events in one location within the configured window produce one Telegram message.
- The final message contains at most one `Сліди` button.
- If a creature leaves before the flush, no target button for that creature is shown.
- Player movement notifications are unchanged.
- AFK/ended/session presence guards still suppress proactive movement notifications at send time.
- Tests cover:
  - arrival + departure coalescing;
  - one `Сліди` button;
  - stale arrival target button suppression;
  - player movement bypassing the coalescer.

## Notes

0.15.8 adds the first conservative implementation:

- `NON_PLAYER_MOVEMENT_NOTIFICATION_WINDOW_MS` controls the window and defaults to 60 seconds;
- player movement remains immediate;
- ordinary animal movement remains quiet;
- visible non-animal creature movement is buffered per location;
- flushes send one compact message with one `Сліди` button;
- the first slice deliberately omits arrival target buttons from coalesced movement messages, which avoids stale target buttons when a spirit/NPC already left before the flush.

An in-memory debounce is acceptable for a first slice if the risk is documented: a process restart may drop pending movement flavor lines. If this becomes important, move the pending buffer to a persisted notification queue.
