# Player Notification Settings

## Purpose

Players can control routine notification surfaces without muting the game, ending the session or disabling urgent messages.

The first setting is narrow: daypart notices for dawn, day, dusk and night. These notices are useful because light and darkness matter, but they can become noisy for players who prefer to check the world manually.

## Daypart Notices

Daypart notices can be changed through:

- `⚙️ Налаштування` in `☰ Меню`;
- `/settings`;
- `/notifications`;
- `/daynotices`;
- `/daynotices on`;
- `/daynotices off`;
- text aliases such as `налаштування`, `сповіщення`, `повідомлення`, `settings`, `notifications` and `daynotices`.

Disabling the setting only suppresses proactive daypart messages. It does not suppress:

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

## Sleep Hint

After the second ordinary wake-up, the game may show a one-time hint:

```text
Підказка після сну

Світ буде й далі мінятися без вас. Якщо повідомлення про світанок, день, присмерк і ніч заважають, їх можна вимкнути в ⚙️ Налаштуваннях або командою /daynotices off.

Але тоді доведеться бути уважнішим: звіряйте /time, /weather, світло, тіні й описи місцини.
```

The hint is not shown after tutorial wake-up and is not shown if daypart notices are already disabled.

## Data Model

The first slice stores the setting directly on `Player`:

```prisma
daypartNoticesEnabled Boolean @default(true)
daypartNoticeHintShown Boolean @default(false)
ordinaryWakeCount Int @default(0)
```

Existing players default to enabled daypart notices.

## Future Settings Candidates

Later settings may cover session reminders, Herald/news notifications, social/group notices, compact notification style or accessibility/verbosity. Danger and safety-critical messages should remain separate from routine-notice preferences.
