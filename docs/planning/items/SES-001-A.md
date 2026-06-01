---
id: SES-001-A
title: AFK and End Session controls
status: testing
type: feature
area: session
priority: high
estimate: 2h
tags:
  - telegram
  - session
  - afk
  - ux
depends_on: []
---

# SES-001-A: AFK and End Session controls

## Goal

Add explicit Telegram session controls so a player can step away or end the current play session without losing character state.

## Scope

- Add a minimal session presence state: `active`, `afk`, `ended`.
- Default existing sessions/players to `active`.
- Add controls:
  - `🌙 AFK / відійти`
  - `🚪 Завершити сесію`
- Add command/text aliases:
  - `/afk`
  - `/end_session`
  - `/leave`
  - `/quit`
  - `afk`
  - `відійти`
  - `завершити сесію`
  - `вийти`
- AFK preserves character, location, tutorial progress, inventory and current scene.
- End Session preserves character, location, tutorial progress, inventory and current scene.
- Manual AFK and Auto-AFK both set presence to `afk` and pause reminders.
- End Session sets presence to `ended`, pauses reminders and is stronger than AFK.
- Any later normal game action resumes the player to `active` and still processes normally.

## Player-Facing Copy

AFK:

```text
Гаразд, сесія на паузі. Я не надсилатиму нагадування, поки ви не повернетеся.

Щоб продовжити, просто напишіть будь-яку дію або натисніть ігрову кнопку.
```

End session:

```text
Сесію завершено. Я не надсилатиму нагадування, доки ви знову не звернетеся до бота.

Щоб повернутися, напишіть /start або будь-яку ігрову команду.
```

Resume:

```text
Ви повертаєте увагу до Чорнолісу.
```

or:

```text
Ви знову прислухаєтеся до Чорнолісу.
```

## Acceptance

- Player can tap `🌙 AFK / відійти` and receives one confirmation.
- Player can tap `🚪 Завершити сесію` and receives one confirmation.
- `/afk` sets presence to `afk`.
- `/end_session`, `/leave` and `/quit` set presence to `ended`.
- AFK and End Session do not delete or reset player state.
- The first normal action after AFK/ended resumes to `active` and still runs.
- New aliases are covered in `scripts/test/input-aliases.cjs` where practical.
