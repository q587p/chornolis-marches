---
id: SOC-009
title: Mail and letter delivery
status: backlog
type: feature
area: social
priority: medium
estimate: 4-8h
tags:
  - social
  - mail
  - letters
  - items
  - settlement
  - async
depends_on:
  - SES-003
  - GIVE-001
  - SETTLE-001
---

# SOC-009: Mail and Letter Delivery

## Goal

Add an in-world mail system: a character can leave a letter for someone else,
and the recipient can read it later when they return to the world.

This should feel like settlement scribes, a post desk, sealed notes, a courier
satchel or a letter chest near a safe anchor, not like a global MMO inbox.

## First Scope

- Let a player write a short letter to a known character / player:
  - from a settlement service or scribe desk first;
  - later, from carried writing supplies if that becomes a real item loop.
- Store the letter durably with sender, recipient, text, created time and read
  state.
- Let the recipient check pending letters later through a clear surface:
  - a settlement post desk / letter chest;
  - a future `/mail` / `/letters` command;
  - a compact pending-mail hint in `/me` or the main menu only if it does not
    become noisy.
- Keep delivery asynchronous. Do not proactively DM AFK or ended-session
  players unless they opted into that behavior.
- Use quote formatting and diegetic copy when reading a letter.

## Item Attachments

Passing items with letters is a later slice unless the item-transfer/storage
rules are ready.

When implemented, attachments should:

- reserve or remove the attached item from the sender only through the normal
  inventory/item ownership layer;
- deliver through a clear accept/take step, not silently mutate the recipient's
  inventory;
- handle failures, full inventory and expired mail safely;
- avoid hidden faucets for money, food, weapons or rare resources;
- never expose private/admin-only item ids in player-facing text.

Possible early attachment examples:

- a small note with one ordinary item;
- a sealed pouch with a tiny amount of money;
- a scribe-mediated parcel that can be refused or returned.

## Commands and Surfaces

Likely typed commands for a future implementation:

- `/mail` / `mail` / `пошта` — show pending letters;
- `/letters` / `letters` / `листи` — alias for the same surface;
- `/send_letter <name> <text>` / `написати лист <name> <text>`;
- `/read_letter <id>` / `прочитати лист <id>`;
- `/reply_letter <id> <text>` / `відповісти на лист <id> <text>`.

Keep command names and Ukrainian aliases synchronized with buttons and `/help`
when the feature moves from backlog to implementation.

## Guardrails

- Do not use mail as a replacement for local speech, whisper or `/reply`.
- Do not bypass AFK / End Session quiet promises.
- Do not deliver broad local chatter as mail.
- Add rate limits and caps:
  - maximum unread letters per recipient;
  - maximum text length;
  - sender cooldowns;
  - overflow/expiration behavior.
- Add block/mute/report or scribe moderation hooks before opening this broadly
  if abuse becomes likely.
- Keep private letter text out of public logs, public chronicles and ordinary
  admin summaries by default.
- Do not let hidden route, location or debug information leak through mail
  rendering.

## Acceptance

- A player can leave a short stored letter for a known recipient.
- The recipient can read that letter later through a diegetic surface.
- Reading marks the letter as read without deleting the audit trail needed for
  abuse handling.
- AFK / ended-session recipients are not proactively messaged immediately.
- Unknown or ambiguous recipients get a clear, atmospheric refusal.
- Tests cover:
  - create letter;
  - read letter;
  - duplicate/read state;
  - capped text length;
  - AFK/end-session quiet behavior;
  - attachment rejection if attachments are not in scope.

## Risks

- This overlaps with deferred private messages (`SES-003`). Keep `SES-003`
  narrow for whispers/replies, and treat this item as deliberate, player-
  authored mail.
- Attachments can become item teleportation if ownership, reservation and
  failure paths are not designed carefully.
- Private text retention needs policy: expiration, moderation access and export
  behavior should be explicit before the system grows.
