---
id: SES-003
title: Deferred private message delivery for AFK and ended sessions
status: backlog
type: feature
area: session
priority: medium
estimate: 2-4h
tags:
  - telegram
  - session
  - speech
  - whisper
  - anti-spam
depends_on:
  - SES-001-A
  - SES-001-B
  - CMD-001
---

# SES-003: Deferred Private Message Delivery

## Goal

Let addressed private speech survive AFK / End Session without breaking the current promise that the bot stays quiet while a player is away.

If someone whispers to an AFK or ended-session player, the recipient should not get an immediate Telegram push. Instead, the message can be stored and delivered when the recipient returns through `/start` or any normal game action.

## First Scope

- Store deferred delivery only for private/addressed speech:
  - `whisper`;
  - later, direct addressed `say`;
  - later, explicit `reply` to that recipient.
- Do not queue broad local chatter, ambient lines, reminders, tutorial nudges or world notices.
- On return, send a compact recap:

```text
Поки ви мовчали, до вас зверталися.

Вереса шепнула:
«Вітаю тут!»
```

- Preserve `/reply` context so the returning player can answer the last deferred speaker.
- Apply caps:
  - maximum stored messages per recipient;
  - maximum delivered messages per return;
  - collapse older overflow into a summary line;
  - discard or archive very old deferred messages.
- Avoid sending a long burst if several people whispered while the recipient was away.

## Acceptance

- Whisper to an active player still delivers immediately.
- Whisper to an AFK or ended-session player records a deferred private message and confirms to the sender that the recipient may read it on return.
- AFK / ended players do not receive proactive Telegram messages immediately.
- Returning to active state delivers at most the configured cap.
- Delivered deferred whispers use quote formatting.
- `/reply` targets the latest delivered/deferred speaker.
- Tests cover active delivery, deferred delivery, cap/overflow behavior and return delivery.

## Risks

- This starts to behave like private mail. Keep the first version narrow and transparent.
- Stored private text needs retention limits and should not appear in public logs or admin summaries by default.
- Abuse protection matters: rate limits and sender cooldowns should prevent whisper-spam against absent players.
