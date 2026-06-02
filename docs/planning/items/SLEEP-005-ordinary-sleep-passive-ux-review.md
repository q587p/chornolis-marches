---
id: SLEEP-005
title: Ordinary sleep passive UX review
status: backlog
type: ux
area: survival
priority: medium
estimate: 30m
tags:
  - sleep
  - commands
  - inventory
  - queue
depends_on:
  - SLEEP-002-A
---

# SLEEP-005: Ordinary Sleep Passive UX Review

## Goal

Review the deliberately strict ordinary-sleep command gate after the first safety policy has settled in live play.

The current behavior intentionally blocks `/me`, inventory / `Речі`, and queue view while a character is in ordinary sleep. That is acceptable as a first safety policy because sleep should not accidentally mutate body, location, inventory, queue or combat state.

This follow-up decides whether some passive, read-only views should be allowed while sleeping without waking the character.

## Scope

- Audit the blocked passive-feeling commands:
  - `/me` / character card;
  - inventory / `Речі`;
  - queue view.
- Decide whether any of them should remain fully blocked or become read-only while ordinary asleep.
- If a read-only view is allowed, keep it strictly non-mutating:
  - no eating, dropping, putting, equipping, unequipping or using items;
  - no queue cancel/clear/reorder;
  - no waking-world look/examine of the location;
  - no auto-mode changes.
- Keep copy atmospheric and clear that the body is still asleep.

## Acceptance

- The chosen policy for `/me`, inventory / `Речі`, and queue view while ordinary asleep is documented.
- Any allowed sleep-time view is read-only and cannot mutate inventory, queue, posture, location, auto-mode, HP, stamina or hunger.
- Blocked sleep-time views still return short atmospheric wake-first copy.
- Focused tests cover the final policy for:
  - `/me` while ordinary asleep;
  - inventory / `Речі` while ordinary asleep;
  - queue view while ordinary asleep.

## Notes

Do not treat the current strict gate as a regression by itself. It is a first-pass safety policy. This item exists so UX can be revisited once ordinary sleep, hunger, session ending and danger interruption have more live feedback.
