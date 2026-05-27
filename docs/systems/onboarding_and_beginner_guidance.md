# Onboarding and Beginner Guidance

Onboarding, `/help`, beginner guidance and future tutorial/helper flows should evolve with the playable game.

When a new player-facing feature is added, check whether it needs to be taught, hinted or at least mentioned for new players. This includes:

- new commands or keyboard buttons;
- new basic actions such as gathering, resting, inspecting, following, using items or speaking;
- new survival states such as hunger, wounds, darkness, light, fire, fatigue or respawn;
- new inventory/resource uses;
- new visibility rules, tracks or local signs;
- new social interactions or reply flows;
- new early-game dangers, safety tools or helper NPC behavior.

## Current Surfaces

Keep these surfaces aligned:

- `/start` and first-run onboarding;
- `/help` / `Допомога`;
- main and secondary keyboards;
- beginner-friendly fallback messages for unknown input;
- planned newcomer helper / tutorial guide;
- planned dream tutorial after onboarding;
- release notes when a feature changes early play.

## Current Dream Tutorial

As of `0.12.0`, the first concrete newcomer path is the dream tutorial in `Дрімотна Межа` on map layer `z = -13`.

- New characters enter the tutorial dream after name/pronoun onboarding.
- The first tutorial location intentionally keeps the reply keyboard minimal: only `Озирнутися` and `Південь` are shown there, even if the character has inventory or technical details available.
- Сон and Дрімота can comment on early tutorial movement: Сон encourages correct forward steps, while Дрімота provides a lightly antagonistic voice when the player turns back.
- Сон and Дрімота also react when a player studies tutorial tracks closely: one rewards attention, the other tries to hurry the player onward.
- `/sleep tutorial` returns a character to the saved tutorial dream position.
- Plain `/sleep` routes to the tutorial while that character has not woken from it yet; after wake, normal sleep remains reserved for a later recovery system.
- The character card includes `Сон` below `Відпочити`; if ordinary sleep is unavailable, the response should offer a direct `Навчальний сон` button.
- `Прокинутися`, `/wake`, `wake`, `прокинутися` and `прокинутись` leave the dream and restore a valid real-world location. Keep direct commands available as an escape hatch, but do not offer the `Прокинутися` button in early tutorial steps; surface it only later as a suggestion after the first tutorial path has opened up.
- The first slice teaches movement and visible locked exits through `Брама Сну`: the south exit stays visible, the reply keyboard wraps its direction label in parentheses while locked, `/open` / `Відкрити` opens it for about 30 seconds, and the gate lazily closes again.
- The current hub exit point is the `Майбутні уроки` feature: inspecting it offers `Прокинутися`, while tutorial voice text explains that the player can later return to the same saved dream position.
- Future tutorial branches should expand from the hub instead of overloading `/help`: social signals, observation/tracking, gathering, fire/light, rest/fatigue and basic danger.

## Design Rule

Teach only what the player can meaningfully use now. Prefer small, diegetic nudges over a mechanical checklist.

When a feature is too early for direct tutorial text, add a planning note instead, so the newcomer path can be updated when the feature becomes real.
