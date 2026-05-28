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
- The tutorial uses the same main 3×3 reply keyboard shape from the first room onward, with available exits and tutorial-only actions opening by location instead of switching to a special simplified keyboard.
- Сон and Дрімота can comment on early tutorial movement: Сон encourages correct forward steps, while Дрімота provides a lightly antagonistic voice when the player turns back.
- Сон and Дрімота also react when a player studies tutorial tracks closely: one rewards attention, the other tries to hurry the player onward.
- `/sleep tutorial` returns a character to the saved tutorial dream position.
- Plain `/sleep` routes to the tutorial while that character has not woken from it yet; after wake, normal sleep remains reserved for a later recovery system.
- The character card includes `Сон` below `Відпочити`; if ordinary sleep is unavailable, the response should offer a direct `Навчальний сон` button.
- `Прокинутися`, `/wake`, `wake`, `прокинутися` and `прокинутись` leave the dream and restore a valid real-world location. Keep direct commands available as an escape hatch, but do not offer the `Прокинутися` button in early tutorial steps; surface it only later as a suggestion after the first tutorial path has opened up.
- The first slice teaches movement and visible locked exits through `Брама Сну`: the south exit stays visible, the reply keyboard wraps its direction label in parentheses while locked, `/open` / `Відкрити` opens it for about 30 seconds, and the gate lazily closes again.
- The current hub exit point is the `Майбутні уроки` feature: inspecting it offers `Прокинутися`, while tutorial voice text explains that the player can later return to the same saved dream position.
- As of `0.12.2`, the hub also branches into short optional rooms:
  - `Ягідний просвіт сну` teaches that `Роздивитися` / `/examine` reveals resources, that berries/herbs are guaranteed to gather inside the dream, and that `Речі` appears after the first successful gather there.
  - `Теплий присілок сну` teaches `Відпочити` / `/rest` as a brief sit/rest action for stamina, with sleep kept separate: each entry leaves the character at roughly a third of ordinary stamina, and the dream fire restores stamina much faster than waking-world rest. The keyboard stays qualitative and may show `екстра` after dream rest, with Сон explaining that the surplus is a dream effect.
- As of `0.12.4`, the hub has a south branch:
  - `Плесо часу сну` teaches `/time` through a small landmark prompt and direct `Час` button.
  - `Затишок останнього кроку` teaches basic safety habits: use `/look` if lost, `/rest` if exhausted, `/me` to check the character, and `Прокинутися` when ready to leave the tutorial.
- Future tutorial branches should expand from the hub instead of overloading `/help`: social signals, observation/tracking, fire/light and basic danger beyond the first safety reminder.

## Design Rule

Teach only what the player can meaningfully use now. Prefer small, diegetic nudges over a mechanical checklist.

When a feature is too early for direct tutorial text, add a planning note instead, so the newcomer path can be updated when the feature becomes real.

After the first tutorial lane, prefer adding short branches that teach the core loop and attention to the world: movement, `Озирнутися`, `Роздивитися`, visible signs, small finds, stamina, rest, safety, social signals and observation. Deeper combat, crafting and economy should wait until the player can already read and inhabit the frontier.
