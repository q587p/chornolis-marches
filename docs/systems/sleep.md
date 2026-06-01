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

## Action Rules

While lying awake, a character can still look, examine, speak, reply and check status/queue surfaces. Physical actions require standing first: movement, gathering, pickup, attack, freshening, cooking, fire and torch handling.

While sleeping, physical actions require waking first. Ordinary sleep also disables player auto-mode so autonomous movement does not continue during sleep.

## Later Work

- `SLEEP-003`: world-time auto-wake, comfort and safety modifiers.
- `DREAM-001`: sleeping-body and dream-presence separation for tutorial and lucid dreams.
- Weather, shelter, active fire and nearby danger can later affect sleep quality without changing the current posture/state split.
