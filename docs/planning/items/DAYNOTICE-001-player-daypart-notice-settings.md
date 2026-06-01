---
id: DAYNOTICE-001
title: Player daypart notice settings
status: testing
type: feature
area: notifications
priority: high
estimate: 2h
tags:
  - notifications
  - world-time
  - daypart
  - sleep
  - settings
  - 0.14
depends_on:
  - WORLD-001-D
  - SLEEP-002
---

# DAYNOTICE-001: Player Daypart Notice Settings

## Summary

Add a player-level setting for routine daypart change notifications and teach the setting once after ordinary sleep.

## User Story

As a player, I can turn off routine messages about dawn/day/dusk/night and turn them back on later, while still receiving urgent gameplay messages and still being able to check `/time` manually.

## 0.14.20 Slice

- Add `Player.daypartNoticesEnabled`, `Player.daypartNoticeHintShown` and `Player.ordinaryWakeCount`.
- Add a focused notification-settings service.
- Add `⚙️ Налаштування` under `☰ Меню`.
- Add `/settings`, `/notifications`, `/daynotices`, `/daynotices on` and `/daynotices off`.
- Add Ukrainian and English text aliases for the settings surface.
- Filter only proactive daypart notices by the new setting.
- Keep daypart `WorldEvent` creation unchanged.
- Show a one-time hint after the second ordinary wake-up, but not after tutorial wake-up and not if the setting is already disabled.
- Add focused tests for eligibility, second-wake hint behavior and settings copy.

## Acceptance

- Player can open settings from `☰ Меню`.
- Player can open settings with `/settings` and `/notifications`.
- Player can disable/enable daypart notices through inline UI.
- Player can disable/enable daypart notices through `/daynotices off` and `/daynotices on`.
- Disabled players do not receive proactive dawn/day/dusk/night messages.
- Enabled players still receive proactive dawn/day/dusk/night messages when active, awake and outside dreams.
- Sleeping players do not receive daypart notices.
- Dream/tutorial players do not receive daypart notices.
- World event rows for daypart changes are still created.
- `/time` and `/weather` still work regardless of notification setting.
- First ordinary wake-up does not show the hint.
- Second ordinary wake-up shows the one-time hint.
- Third and later ordinary wake-ups do not show the hint again.
- Tutorial wake-up does not show the hint.
- Urgent gameplay messages are not suppressed by this setting.

## Risks

- This is the first real player-facing settings surface. The current menu placement is acceptable for the narrow MVP, but future settings should be grouped deliberately instead of expanding the menu one flat button at a time.
- The one-time hint is tied to ordinary wake count, not to whether the player has actually noticed a daypart message.
- Daypart setting callbacks reply with a separate confirmation message instead of editing the existing settings message in place. This can add one extra Telegram message, but is acceptable for the MVP.
- If session presence blocks proactive messages during auto-wake, the hint is not claimed until a send path can show it.
