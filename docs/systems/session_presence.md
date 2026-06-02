# Session Presence

Telegram does not have a clean MUD-style connect/disconnect boundary. A player can leave the chat while the bot still has delayed tutorial lines, companion nudges or reminders ready to send. Session presence is the small policy layer that keeps the bot polite.

## Goal

Do not remind the player to play. Let the bot stay quiet when the player has stepped away.

The MVP should not become a full social status system. It only needs to let a player pause or end the current Telegram play session without deleting character state, location, tutorial progress or inventory.

## MVP States

- `active` — the player is currently interacting with the bot. Direct replies and allowed proactive/reminder messages can be sent.
- `afk` — the player stepped away or crossed the inactivity timeout. Direct future actions should resume the session; idle reminders, delayed tutorial nudges and companion chatter should be silent.
- `ended` — the player explicitly ended the session. Direct future actions may resume the session through a clear return flow; the bot should not send nonessential proactive messages until then. Passive player hunger also pauses while the session is ended by advancing its marker without adding hunger; AFK intentionally does not pause hunger. Future passive survival penalties should follow the same split unless a design note says otherwise: AFK silences bot output, while ended sessions pause non-urgent passive deterioration.

Existing players should default to `active` unless a more specific stored state exists.

## MVP Controls

Use clear labels first:

```text
🌙 AFK / відійти (/afk)
🚪 Завершити сесію (/end_session)
```

Commands and aliases:

```text
/afk
/end_session
/endSession
/leave
/quit
afk
відійти
завершити сесію
вийти
```

`/end_session` is the canonical Telegram command-menu form. `/endSession` is accepted as a compatibility alias when typed manually. `/leave` and bare `вийти` mean ending the Telegram play session. Directional movement out of an inside passage still uses scoped phrases such as `leave cave` or `вийти з кущів`.

## Auto-AFK

Auto-AFK is part of the MVP.

- Track player inactivity with `lastPlayerActionAt` / `lastPlayerMessageAt` style state.
- Update that timestamp only when the player sends a command, presses a button or otherwise interacts.
- Bot messages must not reset the inactivity timer.
- After `AUTO_AFK_AFTER_MINUTES = 13` minutes without player interaction, silently set presence to `afk` and pause reminders.
- Tests may override the timeout with a shorter value.

Auto-AFK must not send its own notification. Its purpose is to stop reminders, tutorial nudges, delayed companion lines and proactive/action-queue messages.

## Auto-End Session

Auto-End Session is the longer inactivity boundary. It protects players who simply leave Telegram for a while without explicitly pressing `🚪 Завершити сесію` (`/end_session`).

- After `AUTO_END_SESSION_AFTER_MINUTES = 60` minutes without player interaction, silently set presence to `ended` for non-auto players.
- Do not auto-end players with `isAutoEnabled = true`; auto-mode means the character is still entrusted to the living world and can keep walking, spending resources, becoming hungry and meeting consequences.
- Auto-End Session must not send its own notification.
- Ended sessions pause passive player hunger by advancing its marker without adding hunger.
- AFK remains notification silence only; it does not pause passive hunger.

## Presence Display

Presence should stay practical and low-noise:

- `/who`, the public `/who` web page and `/who.json` show AFK player characters with a gender-aware suffix after the visible name: ` (відійшов)`, ` (відійшла)`, ` (відійшло)` or ` (відійшли)`.
- Those public `/who` surfaces are for player characters and ordinary NPC/monster characters only. `SPIRIT` / `SPIRITUAL` beings such as the camp spirit cat or Дід лісовик stay out of the active-character list even if they are awake or recently updated.
- `/all` shows the same suffix for AFK player rows so scribes can tell the difference between an active character and someone who paused the session.
- Do not add a separate proactive message when Auto-AFK sets this suffix; the visible status is only shown when someone asks for a list.
- `ended` remains a session-control state, not a public atmospheric label in the MVP.

## Idle Reminder Limit

Auto-AFK is the final silence mechanism, but the bot must also stay quiet before the inactivity timeout.

MVP rule: no more than one idle reminder per scene.

A scene can be interpreted pragmatically:

- current tutorial step;
- current location prompt;
- current awaited choice;
- current action state where the bot expects input.

For the first implementation, the current location is a valid scene key for tutorial idle reminders. When the player moves to a new location/scene, the stored scene key changes and the count resets. If a reminder was prepared for an older scene, it must check the current scene immediately before sending and skip itself if the player has moved on.

Stored state:

```text
idleReminderSceneKey
idleReminderCountForCurrentScene
```

Send-time rule:

```text
presence must be active
remindersPaused must be false
the bot must actually be awaiting player input
current scene key must match the reminder scene key
idleReminderCountForCurrentScene must be lower than 1
```

One idle reminder should be one short nudge. Do not stack a system reminder, Сон line, Дрімота line, action hint and tutorial explanation together.

## Player-Facing Responses

Manual AFK:

```text
Гаразд, сесія на паузі. Я не надсилатиму нагадування, поки ви не повернетеся.

Щоб продовжити, просто напишіть будь-яку дію або натисніть ігрову кнопку.
```

End session:

```text
Сесію завершено. Я не надсилатиму нагадування, доки ви знову не звернетеся до бота.

Щоб повернутися, напишіть /start або будь-яку ігрову команду.
```

Resume from AFK or ended should be short and attached to the player's next response, not sent as a separate proactive push:

```text
Ви знову прислухаєтеся до Чорнолісу.
```

Do not add a long recap in the first slice unless a concise current-state renderer already exists.

## Guard Rule

Before sending any scheduled, delayed, reminder or companion proactive message, reload/check the player's session presence.

Allowed:

- direct replies to the player's current command or button;
- proactive/reminder messages only when presence is `active`.

Disallowed:

- presence is `afk`;
- presence is `ended`;
- `remindersPaused` is true;
- the delayed message is stale because the player has acted since it was scheduled;
- the relevant session/player was reset or deleted.

Do not only block new scheduling. Every delayed/proactive sender should use a shared helper such as `canSendProactiveMessage` immediately before sending, because the player may have gone AFK or ended the session after the message was scheduled.

Idle reminders should use the stricter `canSendIdleReminder` / scene-claim helper immediately before sending, because the player may also have changed scenes or already received the one allowed reminder for that unresolved prompt.

## Backlog

- More atmospheric labels for AFK/end session.
- Diegetic sleep/rest integration.
- Visible social online/away status for other players.
- Advanced presence display.
- Configurable player notification preferences.
- Richer return-from-AFK recap.
- Companion verbosity budgets and daily return hooks.
