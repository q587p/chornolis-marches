---
id: HERALD-003
title: Herald chronicle chat relay
status: backlog
type: feature
area: herald
priority: medium
estimate: 2-4h
tags:
  - herald
  - chronicle
  - telegram
  - chat
  - world-events
depends_on:
  - PROG-005
  - PROG-006
---

# HERALD-003: Herald Chronicle Chat Relay

## Goal

Let the Boundary Mark Chancery Herald publish selected public chronicle entries into a configured Telegram chat or channel, so world history can appear as a living notice stream instead of only an on-demand `/chronicles` archive.

## Scope

- Add a Herald-side relay for chronicle-worthy `WorldEvent` rows after the chronicle source format is stable enough:
  - new character arrivals;
  - notable public world milestones;
  - future ecology or settlement events that are explicitly marked public.
- Add configuration for the destination chat/channel and an enable flag, separate from ordinary `news.md` publication settings.
- Reuse existing Herald outbox/idempotency patterns where practical so restart/retry behavior does not duplicate chronicle posts.
- Keep chronicle relay text short, atmospheric and safe for public chat.
- Document how this differs from:
  - public `/chronicles`;
  - local in-game arrival messages;
  - admin real-time event audit from `PROG-006`;
  - `news.md` release/update publishing.

## Guardrails

- Do not relay private/player-only, scribe-only or admin-only events.
- Do not expose Telegram ids, usernames, moderation details, onboarding internals or exact technical timestamps in public chronicle chat.
- Do not make every `WorldEvent` eligible; only explicitly public chronicle events should be relayed.
- Avoid noisy repeat loops. If an event is edited/replayed/backfilled, the Herald should either skip it or mark it as historical/catch-up intentionally.
- Do not couple the main game bot and Herald bot tokens/chats more tightly than necessary.

## Acceptance

- A configured Herald instance can relay a newly created public chronicle entry to the configured chat/channel once.
- Backfilled older chronicle entries do not spam the chat unless a deliberate catch-up mode is enabled.
- Relay state survives restart and avoids duplicate posts.
- Tests or a fake-publisher helper cover normal publish, retry, duplicate-suppression and backfill-skip behavior.
- Ops docs describe the required env variables and the relationship to Herald news publishing.

## Notes

This should follow or land together with `PROG-006`, because the public chronicle/local-message/admin-audit split needs to be clear before the Herald starts broadcasting chronicle entries outside the game chat.
