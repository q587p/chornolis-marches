# Player Notification Settings

## Purpose

Players can control routine notification surfaces without muting the game, ending the session or disabling urgent messages.

The first settings are intentionally narrow:

- daypart notices for dawn, day, dusk and night;
- auto-action messages for players who intentionally want to keep seeing their own auto-mode choices and completions after longer inactivity.

Daypart notices are useful because light and darkness matter, but they can become noisy for players who prefer to check the world manually. Auto-action messages are useful for players who deliberately run auto-mode and want a visible trail of what happened; by default they remain quiet after Auto-AFK to avoid chat spam.

## Daypart Notices

Daypart notices can be changed through:

- `⚙️ Налаштування` in `☰ Меню`;
- `/settings`;
- `/notifications`;
- `/daynotices`;
- `/daynotices on`;
- `/daynotices off`;
- text aliases such as `налаштування`, `сповіщення`, `повідомлення`, `settings`, `notifications` and `daynotices`.

## Auto-Action Messages

Auto-action messages can be changed through:

- `⚙️ Налаштування` in `☰ Меню`;
- `/settings`;
- `/notifications`;
- `/automessages`;
- `/automessages on`;
- `/automessages off`;
- text aliases such as `automessages`, `auto messages`, `автоповідомлення` and `авто повідомлення`.

Default: `off`.

When disabled, auto-mode can continue to move, inspect, gather or queue actions, but once the player has crossed the Auto-AFK inactivity boundary, routine own-action Telegram messages may be suppressed. This keeps auto-mode from flooding a chat that the player is no longer actively reading.

When enabled, own auto-mode messages with `WorldAction.note` starting with `auto:` may still be delivered after Auto-AFK:

- auto action chosen/queued notices;
- the actual completion result of the queued auto action;
- the queue-finished keyboard refresh for that auto action;
- auto rest / auto stand notes;
- auto social signals.

Manual AFK and ended sessions are stronger than this preference. They still suppress auto-action messages. The preference is not a promise to receive every world/proactive message and must not bypass danger/session safety policy.

This is the first player-facing settings surface. The current menu placement is acceptable for the narrow MVP, but future settings should be grouped deliberately instead of adding one more flat button for every preference.

Disabling daypart notices only suppresses proactive daypart messages. It does not suppress:

- explicit `/time` or `/weather` command replies;
- direct command replies;
- queue completion;
- hunger cues;
- combat, death, knockout or danger messages;
- speech, whispers, replies, shouts or social signals;
- world event creation.

The world still changes. The player simply stops receiving separate proactive messages when a daypart boundary is crossed.

## Delivery Rule

A proactive daypart notice can be sent only when all of these are true:

- the player has a current location;
- the player is awake;
- the player is not in a tutorial/future dream layer;
- `daypartNoticesEnabled` is `true`;
- existing session/proactive checks allow a proactive Telegram message.

This rule is intentionally implemented through a daypart-specific notification helper. Broader proactive helpers must not read `daypartNoticesEnabled`, because the setting is not a global mute.

Auto-action delivery is intentionally implemented through the player-action delivery helper, not through the broad proactive helper. It may bypass Auto-AFK only for `auto:*` action notes and only when `autoActionMessagesEnabled` is true. It must not bypass manual AFK, ended sessions or onboarding guards.

## Sleep Hint

After the second ordinary wake-up, the game may show a one-time hint:

```text
Підказка після сну

Світ буде й далі мінятися без вас. Якщо повідомлення про світанок, день, присмерк і ніч заважають, їх можна вимкнути в ⚙️ Налаштуваннях або командою /daynotices off.

Але тоді доведеться бути уважнішим: звіряйте /time, /weather, світло, тіні й описи місцини.
```

The hint is not shown after tutorial wake-up and is not shown if daypart notices are already disabled.

The hint is based on `ordinaryWakeCount`, not on whether the player actually saw, read or felt bothered by daypart notices. That is acceptable for the MVP because it teaches the setting after ordinary sleep starts mattering, but later notification education may need more precise triggers.

## Callback Behavior

Inline daypart setting callbacks reply with a separate confirmation message instead of editing the existing settings message in place. This may add one extra Telegram message during toggling, but it keeps the MVP simple and avoids overfitting the first settings surface before more preferences exist.

## Data Model

The first slice stores the setting directly on `Player`:

```prisma
daypartNoticesEnabled Boolean @default(true)
daypartNoticeHintShown Boolean @default(false)
ordinaryWakeCount Int @default(0)
autoActionMessagesEnabled Boolean @default(false)
```

Existing players default to enabled daypart notices.
Existing players default to disabled auto-action messages.

## Future Settings Candidates

Later settings may cover session reminders, Herald/news notifications, social/group notices, compact notification style or accessibility/verbosity. Danger and safety-critical messages should remain separate from routine-notice preferences.
