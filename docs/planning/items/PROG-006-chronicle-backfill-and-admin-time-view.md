---
id: PROG-006
title: Chronicle registration backfill and admin real-time view
status: backlog
type: feature
area: progression
priority: high
estimate: 2-4h
tags:
  - chronicle
  - world-events
  - onboarding
  - admin
  - local-chat
depends_on:
  - PROG-005
---

# PROG-006: Chronicle Registration Backfill And Admin Real-Time View

## Goal

Make public chronicles feel complete and useful by backfilling earlier character registrations, showing new arrivals locally when appropriate, and giving scribes/admins a real-time timestamped view of registration-like events.

The current `/chronicles` MVP records new arrivals only after the chronicle slice exists. Older characters can be reconstructed from `Player.createdAt`, but that should be done deliberately and idempotently.

## Scope

- Add an idempotent backfill for previous player registrations:
  - read existing `Player` rows;
  - create missing `Chronicle: new_player` `WorldEvent` entries;
  - preserve the original `Player.createdAt` as the chronicle event time where practical;
  - avoid duplicating players that already have a chronicle event.
- Make new-player chronicle entries visible in the appropriate local chat/location when the registration becomes a world-facing arrival:
  - do not spam every global channel;
  - keep wording atmospheric and short;
  - avoid leaking hidden/admin-only onboarding details.
- Add a scribe/admin command for real-time event audit:
  - show registrations and similar chronicle-worthy events with exact real timestamps;
  - support pagination or a compact `latest N` view;
  - distinguish real `createdAt` time from future in-world time.
- Document the difference between:
  - public `/chronicles` archive text;
  - local arrival messages;
  - admin real-time audit view.

## Guardrails

- Backfill must be safe to run more than once.
- Do not rewrite unrelated `WorldEvent` history.
- Do not use real timestamps as world-time lore. Real time is for archive/admin audit only.
- Do not reveal Telegram ids, admin-only fields or private onboarding state in public/local chronicle messages.
- Keep the local chat message tied to actual location visibility/presence rules where practical.

## Acceptance

- Existing players without `Chronicle: new_player` entries get one backfilled entry.
- Running the backfill twice creates no duplicates.
- New future registrations can emit both the public chronicle event and a local arrival-style message when appropriate.
- Admin command shows exact real event times for registrations and similar chronicle entries.
- Tests cover backfill idempotency and chronicle/admin time formatting.

## Notes

This should probably land before personal chronicles become larger. A complete public arrival archive makes later private/public history split easier to reason about.
