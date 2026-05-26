# Social Signals / Сигнали

Social signals are a small MUD-like expressive system for Chornolis Marches.

They are not real gameplay actions like attacking, gathering or moving. They are short, controlled gestures that show attitude, mood or intent toward another character, creature, spirit or the surrounding location.

Player-facing UI should call them **Сигнали**.

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

When focusing on a visible target, the target action keyboard may show quick contextual signals plus **Ще сигнали**.

Examples:

- under another player: **Кивнути**, **Помахати**, **Ще сигнали**;
- under a neutral NPC: **Кивнути**, **Усміхнутися**, **Ще сигнали**;
- under an animal or suspicious target: **Вказати**, **Насупитися**, **Ще сигнали**.

The full **Ще сигнали** menu shows the whole MVP set for the selected target.

Do not add generic `/emote <text>` in this iteration. Freeform emotes can blur the line between expressive text and real game actions.

## Text input

Social signals also have Ukrainian/MUD-style text aliases through the input alias layer.

Examples:

- `кивнути 1`
- `помахати мандрівник`
- `усміхнутися травник`
- `вказати на вовка`
- `насупитися вовк`

Target text resolves against visible nearby targets by number, id or visible name. If several targets match, the bot asks the player to clarify.

See `docs/systems/input_aliases.md` for the broader button/command parity rule.

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

- NPC reactions to signals;
- mood/reputation effects;
- targetless signals for the whole location;
- more ritual, hostile, fearful and group-play signals;
- moderation and clear rules for any future freeform emote command.
