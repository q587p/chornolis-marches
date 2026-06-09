# Sleep and Posture

Sleep is separate from posture, active rest and tutorial dreams.

## Current MVP

- `standing`, `sitting` and `lying` are posture states.
- `Відпочити` (`/rest`) is active rest while sitting.
- `Лягти` (`/lie`) changes posture only. It does not start rest or sleep.
- Plain `Спати` (`/sleep`) starts ordinary sleep in the current waking-world location.
- `Навчальний сон` (`/sleep tutorial` or `/sleep_tutorial`) stays explicit and remains the tutorial dream entry.
- `Прокинутися` (`/wake`) wakes from ordinary sleep first, then falls back to tutorial-dream wake behavior when appropriate.

Ordinary sleep sets posture to `LYING` and stores a separate `sleepState`. Waking clears the sleep state but leaves the character lying, so they can choose to sit or stand.

Ordinary sleep also stores the in-world minute when sleep begins. Recovery checks can wake the character automatically after enough world time passes: roughly eight game hours when HP and stamina have reached the local cap, or roughly ten game hours as a first upper bound. Active nearby campfires improve the sleep recovery profile and can raise the temporary stamina cap a little. Feature-level comfort surfaces such as the starter cellar `Сухі лежанки` can also make sleep stamina recovery modestly faster than sleeping on bare ground.

## Action Rules

While lying awake, a character can still look, examine, speak, reply and check status/queue surfaces. Physical actions require standing first: movement, gathering, pickup, attack, freshening, cooking, fire and torch handling.

While sleeping, physical actions require waking first. Ordinary sleep also disables player auto-mode so autonomous movement does not continue during sleep.

Near-term command policy: ordinary sleep should gate most commands, not only physical actions. While in ordinary sleep, allow only sleep-relevant or passive commands such as `Прокинутися` (`/wake`), `/time`, `/weather`, `/help`, `/commands`, `/chronicles`, `/news` and session-safety commands. Active commands such as movement, look/examine of the waking location, speech, socials, inventory use, gathering, pickup, dropping, cooking, fire handling, auto and queue mutation should answer atmospherically that this cannot be done while asleep and offer waking.

## Later Work

- `SLEEP-002-A`: ordinary sleep command gate and allowlist.
- `SLEEP-003`: remaining broad shelter, safety and interruption modifiers.
- `DREAM-001`: sleeping-body and dream-presence separation for tutorial and lucid dreams.
- Weather, shelter, active fire and nearby danger can later affect sleep quality without changing the current posture/state split.
