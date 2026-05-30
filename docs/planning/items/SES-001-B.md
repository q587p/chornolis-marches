---
id: SES-001-B
title: Auto-AFK and proactive message guards
status: testing
type: feature
area: session
priority: high
estimate: 2h
tags:
  - telegram
  - session
  - reminders
  - tutorial
depends_on:
  - SES-001-A
---

# SES-001-B: Auto-AFK and proactive message guards

## Goal

Prevent reminders, delayed tutorial nudges and companion chatter from reaching players who are AFK, have ended their session or have silently crossed the Auto-AFK inactivity timeout.

## Scope

- Add a shared helper such as `canSendProactiveMessage`.
- Track player inactivity with `lastPlayerActionAt` / `lastPlayerMessageAt` style state.
- Update inactivity only from player commands, buttons or other player interaction; bot messages must not reset it.
- Add `AUTO_AFK_AFTER_MINUTES = 15`, with tests able to override the value.
- After inactivity crosses the threshold, silently set presence to `afk` and pause reminders.
- Do not send a push message just to announce Auto-AFK.
- Add a strict idle-reminder cap: no more than one idle reminder per current scene/tutorial step/awaited choice.
- Track the current idle-reminder scene key and count on the player/session.
- Reset the count when the player reaches a new scene key.
- Keep idle reminder content to one concise nudge; do not stack Сон, Дрімота, system and action hints together.
- Check current session presence at send time, not only when a delayed line is scheduled.
- Apply the guard to known non-direct message sources:
  - idle reminders;
  - delayed tutorial nudges;
  - delayed Сон/Дрімота lines;
  - action queue or worker messages that are not direct replies;
  - scheduled Telegram messages or timeout callbacks.
- Keep direct replies to player commands working after resume.

## Stale Message Note

If delayed messages already store enough context, also skip stale messages when the player has acted or moved since scheduling. If this is too large for the first pass, ship the presence guard first and leave stale-versioning as a follow-up note.

## Acceptance

- A delayed tutorial/companion line scheduled before AFK does not send after AFK.
- A delayed tutorial/companion line scheduled before End Session does not send after End Session.
- If the player does nothing for the configured inactivity window, the session silently becomes AFK.
- Auto-AFK does not send its own notification.
- First idle reminder in a scene can send.
- Second idle reminder in the same unresolved scene is blocked.
- Moving to a new scene/tutorial step resets the idle reminder count.
- A reminder prepared before a scene change is skipped at send time.
- Bot messages do not reset the inactivity timer.
- Idle reminder logic checks session presence.
- Guard logic is centralized or consistently reused.
- Direct command replies still work normally after resume.
- Existing tutorial flow still works for active players.
