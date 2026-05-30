---
id: FOOD-004
title: Hunger cues and eating nudges
status: backlog
type: feature
area: survival
priority: medium
tags:
  - food
  - hunger
  - reminders
  - ux
depends_on:
  - FOOD-001
  - SES-001
---

# FOOD-004: Hunger cues and eating nudges

## Goal

Let the game gently tell a player when hunger has become worth acting on, now that hunger can already be eased through berries, mushrooms, herbs and cooked meat.

## Problem

The character card shows hunger state, and inventory actions can eat available food, but a player may not notice that hunger has crossed into a meaningful state during play. A small diegetic cue would make the existing food loop clearer without turning the bot into a notification machine.

## Scope

- Add short hunger cues when hunger crosses a meaningful threshold.
- Prefer cues attached to a player response or scene update, not standalone push messages.
- If a delayed/proactive cue is used, it must obey `SES-001` send-time guards:
  - no cue while AFK;
  - no cue after End Session;
  - no cue when reminders are paused;
  - no repeated cue for the same unresolved scene/state.
- Mention available eating routes when relevant:
  - `Речі` (`/inventory`) if the player carries edible food;
  - cooking raw meat near a campfire if the player carries raw meat and fire is available;
  - gathering/eating local edible resources only when the current location actually supports that.
- Keep the text short and atmospheric.

## Example Copy

```text
Живіт стиха нагадує про себе. У речах є щось їстівне.
```

```text
Голод уже не просто тінь. Варто поїсти, якщо маєш що.
```

## Timing Notes

This does not need to wait for full `WORLD-001` day/night time if it can be based on existing hunger state changes. After world-time flow exists, the same cue layer can become more natural by noticing morning/evening, long travel or skipped rest.

## Acceptance

- Hunger threshold crossing can produce at most one concise cue until the hunger state changes again.
- Cues do not fire for AFK or ended sessions.
- Bot messages do not reset the player inactivity timer.
- If the player has edible inventory, the cue points toward `Речі` (`/inventory`) rather than generic `/help`.
- If the player has no visible eating option, the cue stays atmospheric and does not promise unavailable food.
- Tests cover threshold detection, duplicate suppression and AFK/end-session send-time guard behavior.
