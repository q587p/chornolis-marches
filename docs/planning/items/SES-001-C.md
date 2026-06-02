---
id: SES-001-C
title: Session presence tests and manual checklist
status: testing
type: qa
area: session
priority: high
estimate: 1h
tags:
  - telegram
  - session
  - tests
  - qa
depends_on:
  - SES-001-A
  - SES-001-B
---

# SES-001-C: Session presence tests and manual checklist

## Goal

Cover the AFK / End Session MVP with focused automated tests where practical and a small manual QA checklist for Telegram behavior.

## Automated Coverage

Prefer small tests around helpers and alias parsing:

- `canSendProactiveMessage(active)` returns true.
- `canSendProactiveMessage(afk)` returns false.
- `canSendProactiveMessage(ended)` returns false.
- `canSendProactiveMessage(remindersPaused)` returns false.
- Auto-AFK helper returns true only after the configured inactivity threshold.
- Auto-End helper returns true only after the longer inactivity threshold, and only for non-auto players.
- First idle reminder is allowed for a current active scene.
- Second idle reminder in the same scene is blocked.
- New scene key resets the idle reminder counter.
- Idle reminder without awaited player input is blocked.
- Idle reminder after AFK/end is blocked.
- `/afk` maps to the AFK action.
- `/end_session`, `/leave` and `/quit` map to End Session.
- A normal command after AFK/ended resumes the player to `active` if handler-level tests exist.

## Manual Checklist

AFK:

- Start or continue a session.
- Trigger a scene where a tutorial nudge or companion line could normally speak later.
- Tap `🌙 AFK / відійти`.
- Confirm the bot replies once.
- Wait longer than the old delayed message interval.
- Confirm no extra reminder/companion message arrives.
- Send `Озирнутися` or tap a normal game button.
- Confirm the action works and the session resumes.

End Session:

- Tap `🚪 Завершити сесію`.
- Confirm the bot replies once.
- Wait longer than the old delayed message interval.
- Confirm no extra reminder/companion message arrives.
- Send `/start` or `Озирнутися`.
- Confirm the bot resumes without deleting character/location/progress.

Regression:

- Normal tutorial still works if the player never enters AFK/ended.
- Bot messages do not reset player inactivity.
- Long inactivity silently ends non-auto sessions, while auto-enabled characters stay in the world.
- Delayed messages scheduled before AFK/end are skipped at send time.
- Delayed idle reminders scheduled before scene change are skipped at send time.
- Сон and Дрімота do not keep nudging repeatedly in the same scene.
- Direct command responses are not blocked for active players.
- Keyboard still contains core gameplay actions.
- AFK/End Session buttons are not duplicated repeatedly.

## Acceptance

- Focused tests cover the helper/alias behavior that can be checked without Telegram.
- Manual checklist is included in docs or release notes when the feature ships.
- QA notes explicitly mention delayed/proactive message silence while AFK/ended.
