# Social Signals / Сигнали

Social signals are a small MUD-like expressive system for Chornolis Marches.

They are not real gameplay actions like attacking, gathering or moving. They are short, controlled gestures that show attitude, mood or intent toward another character, creature, spirit or the surrounding location.

Player-facing UI should call them **Сигнали**. The visible button label should also be a typed alias: `сигнал`, `сигнали`, `signals`, `socials` and `/signals` open the same targetless signal menu from the character card.

Design priority after the tutorial: keep signals visible as part of the minimal living-world loop. They should make nearby beings feel present and responsive before larger speech, reputation, faction or combat systems arrive.

Developer/design notes may call the system **соціальні сигнали / socials**.

## MVP Set

The first implemented set is intentionally small:

| Signal | Intent |
|---|---|
| Усміхнутися | friendly or warm signal |
| Засміятися | amusement, nervousness or mockery depending on context |
| Кивнути | acknowledgement or agreement |
| Вклонитися | respect or ritual politeness |
| Вказати | point at someone or something |
| Насупитися | displeasure, suspicion or anger-lite |
| Зітхнути | tiredness, disappointment, fear or resignation |
| Помахати | greeting or farewell |

## UI Pattern

When focusing on a visible target, the target action keyboard should keep the main target actions grouped and predictable:

- first row: **Глянути**, **Роздивитися**, and **Атакувати** only when the target is actually attackable;
- second row: **Привітати**, **Сказати**, **Прошепотіти** where the target can meaningfully receive them;
- third row: quick contextual signals such as **Кивнути**, **Помахати**, plus **Ще сигнали**;
- final row: **Назад**.

`Глянути` is the brief visible-state inspect path. `Роздивитися` is the fuller inspect path. `Сказати` and `Прошепотіти` open a short text prompt and then reuse the ordinary speech queue/action layer with the selected target.

Examples:

- under another player: **Кивнути**, **Помахати**, **Ще сигнали**;
- under a neutral NPC: **Кивнути**, **Помахати**, **Ще сигнали**;
- under an animal or suspicious target: **Вказати**, **Насупитися**, **Ще сигнали**.

The full **Ще сигнали** menu shows the whole MVP set for the selected target.

Do not add generic `/emote <text>` in this iteration. Freeform emotes can blur the line between expressive text and real game actions.

## Text input

Social signals also have Ukrainian/MUD-style text aliases through the input alias layer.

Examples:

- `кивнути 1`
- `помахати мандрівник`
- `усміхнутися травник`
- `усміхнутися`
- `посміх`
- `вказати на вовка`
- `насупитися вовк`

Targetless player gestures are allowed for signals that make sense without a direct target, such as smiling, nodding, bowing, sighing, laughing, waving or glaring. Signals that need an object, such as pointing, should still ask for a visible target.

The character card should expose these targetless gestures through a compact `Сигнали` button near `Речі`, so players can use small social actions without first opening a target-specific interaction menu.

## Events and chat

Social signals write `SOCIAL_SIGNAL` world events. `/chat` includes these events alongside speech and greetings, so social gestures become part of the local conversational history instead of being only transient Telegram messages.

## Future Greeting Inspiration

`SOC-010` tracks a possible small stamina/ease benefit from direct greetings.
If implemented, it should stay gentle and cooldowned: a greeting can make the
recipient feel a little more ready for the road, but it should not replace rest,
food, sleep or fire. Ordinary text should say that the greeting gave a small
warmth or steadiness, not expose a raw `+Снага` number.

## NPC and auto use

The shared social-signal layer can be used by players, auto-mode and NPCs.

- Player auto-mode may occasionally use a visible social signal when another character, NPC or animal is nearby.
- Hunters can answer a small fitting subset of direct signals through the same shared social-signal layer: a nod gets a nod back, a wave gets a wave back, and a smile or bow currently gets a brief acknowledging nod. They should not react to every signal; profession/status should decide what feels appropriate.
- Herbalist / знахар NPCs have a small signature set: `Притишити`, `Кивнути` and `Вказати`.
- A herbalist may use `Притишити` or `Кивнути` without a target as a location-level gesture, or aim a signal at a nearby player, NPC or animal. Targetless text should use present tense, e.g. `Здравомир киває.`, to match other local action messages.
- Basic animal reactions exist: a signal aimed at a living animal can startle it. If that happens, the animal drops its current queued/running action and flees through a visible exit.

Target text resolves against visible nearby targets by number, id or visible name. If several targets match, the bot asks the player to clarify.

See `docs/systems/input_aliases.md` for the broader button/command parity rule.

## Tutorial Hook

Teach social signals after the first speech lesson, not before it. The dream tutorial should first show that words can affect the world and reach other characters, then introduce signals as smaller controlled gestures.

- A Сон/Дрімота or nearby-character moment can invite the player to nod, wave, smile or bow.
- The lesson should stay compact and diegetic: no `quest accepted`, no generic emote wall, and no implication that signals replace conversation.
- This hook should sit near the planned speech-mode lesson for `say`, `shout`, `whisper` and `reply`, so new players learn the difference between words, loud words, private words and gestures.

## Message Model

Each signal should support separate text for:

- actor;
- target, when the target is a player;
- observers in the same location.

Example: `Вклонитися` to a forest being.

- Actor: `Ви вклоняєтеся Діду лісовику.`
- Target: `587 вклоняється вам.`
- Observers: `587 вклоняється Діду лісовику.`

Signals should use existing Ukrainian name forms where available.

## Future Work

Future versions may add:

- richer NPC and creature reactions to signals;
- mood/reputation effects;
- targetless signals for the whole location;
- contextual whisper observer detail: ordinary bystanders should only see that a whisper happened, while a recent close inspection of the location, author or recipient may later justify showing whom the whisper was aimed at;
- more ritual, hostile, fearful and group-play signals;
- moderation and clear rules for any future freeform emote command.
