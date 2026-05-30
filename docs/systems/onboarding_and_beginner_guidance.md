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
- character-name creation, including prepared names and custom-name guidance;
- `/help` / `Допомога`;
- main and secondary keyboards;
- beginner-friendly fallback messages for unknown input;
- planned newcomer helper / tutorial guide;
- planned dream tutorial after onboarding;
- release notes when a feature changes early play.

## Current Dream Tutorial

As of `0.12.0`, the first concrete newcomer path is the dream tutorial in `Дрімотна Межа` on map layer `z = -13`.

- New characters enter the tutorial dream after name/pronoun onboarding.
- As of `0.13.1`, name onboarding offers a broader prepared scribe-approved name pool or a custom-name path with a warning and stricter forbidden-name normalization. Once onboarding is complete, old inline name-choice buttons should not reopen character creation; `/restart` remains the explicit reset path. Keep this aligned with `docs/systems/character_names.md` when the name pool or validation rules change.
- The tutorial starts with a minimal reply keyboard that shows only `Озирнутися` and the visible south path. The second step stays narrow too: it shows only `Озирнутися`, `Північ` and `Південь`, without `Речі`, `Допомога`, `Меню`, `Роздивитися`, posture actions or the status strip. After that, the dream keyboard fills in available exits and tutorial-only actions by location, but keeps ordinary utility actions quiet: `Допомога` and `Меню` stay hidden in dream rooms, `Речі` appears once the character actually has inventory, `Роздивитися` stays visible after the first examine/feature-inspection lesson, and the ordinary status strip appears after the stamina/rest lesson. The rest room can show status before that because it is the room teaching `Снага`.
- Сон and Дрімота can comment on early tutorial movement: Сон encourages correct forward steps, while Дрімота provides a lightly antagonistic voice when the player turns back.
- Сон and Дрімота also react when a player studies tutorial tracks closely: one rewards attention, the other tries to hurry the player onward.
- `/sleep tutorial` returns a character to the saved tutorial dream position.
- Plain `/sleep` routes to the tutorial while that character has not woken from it yet; after wake, normal sleep remains reserved for a later recovery system.
- Entering the tutorial dream turns off player auto mode, both persistent state and the active runtime timer where available, so the dream remains a focused player-controlled teaching space.
- Scribes can use `/tutorialReset [character]` to clear a character's completed tutorial marker and make the tutorial start location the saved dream location for the next `/sleep tutorial`.
- The character's own `/me` view should mention when the tutorial dream is not yet complete, so players have a direct reminder without needing an admin check.
- `/start`, `/help` and unknown-input fallback messages should remind unfinished characters that `/sleep tutorial` / `навчальний сон` returns them to the dream. `/help` may add a direct `Навчальний сон` button for those characters.
- The character card includes `Сон` below `Відпочити`; if ordinary sleep is unavailable, the response should offer a direct `Навчальний сон` button.
- `Прокинутися`, `/wake`, `wake`, `прокинутися` and `прокинутись` leave the dream and restore a valid real-world location. Keep direct commands available as an escape hatch, but do not offer the `Прокинутися` button in early tutorial steps; surface it only later as a suggestion after the first tutorial path has opened up.
- The first slice teaches movement, speech and visible locked exits through `Брама Сну`: the south exit from the gate and the north exit back from the hub stay visible, the reply keyboard wraps each locked direction label in parentheses, and the gate prompt uses `/say Відчинитися` / `Сказати «Відчинитися»` plus natural variants like `Відчинись будь ласка` to open the passage from both sides for a cycling window of about 30 seconds, 1 minute, 2 minutes, 4 minutes, 8 minutes, then back to 30 seconds. The older `/open` path may remain as a compatibility escape hatch, but the tutorial should teach that written signs and spoken text can affect the world.
- Slow tutorial pace comments should use a pool of Сон/Дрімота pairs and the same 30s, 1m, 2m, 4m, 8m cycling rhythm so repeated nudges feel varied instead of spammy.
- The current hub exit point is the `Майбутні уроки` feature: inspecting it offers `Прокинутися`, while tutorial voice text explains that the player can later return to the same saved dream position.
- The hub also exposes `Кущі` as an inspectable feature with a `Всередину` action. The inner observation space mirrors it with `Кущі` and a `Назовні` action. This teaches that exits are not only compass directions: future locations can use inside/outside, up/down, hidden entrances, dens, trees, pits or similar diegetic movement anchors.
- As of `0.12.2`, the hub also branches into short optional rooms:
  - `Ягідний просвіт сну` teaches that `Роздивитися` / `/examine` reveals resources, that gathering spends both time and stamina, that berries/herbs are guaranteed to gather inside the dream, and that `Речі` appears after the first successful gather there if it is not already available.
  - `Теплий присілок сну` teaches `Відпочити` / `/rest` as a brief sit/rest action for stamina, with sleep kept separate: each entry leaves the character at roughly a third of ordinary stamina, and an inspectable rest seat offers `Присісти і відпочити` as a diegetic shortcut to `/rest`. The next western rest room keeps the dream fire / жар version where recovery feels much faster than waking-world rest. The keyboard stays qualitative and may show `екстра` after dream rest, with Сон and Дрімота using separate quoted messages for rest guidance and Сон explaining that the surplus is a dream effect.
- As of `0.12.4`, the hub has a south branch:
  - `Плесо часу сну` teaches `/time` through a small landmark prompt and direct `Час` button.
  - `Затишок останнього кроку` teaches basic safety habits: use `/look` if lost, `/rest` if exhausted, `/me` to check the character, and `Прокинутися` when ready to leave the tutorial.
- Future tutorial branches should expand from the hub instead of overloading `/help`: social signals, observation/tracking, fire/light and basic danger beyond the first safety reminder.

## Design Rule

Teach only what the player can meaningfully use now. Prefer small, diegetic nudges over a mechanical checklist.

When a feature is too early for direct tutorial text, add a planning note instead, so the newcomer path can be updated when the feature becomes real.

General survival/adventuring tips should not stay buried in the hidden `/commands` catalog. Keep `/commands` as a command reference, and move broad advice into `/help` or tutorial/newcomer surfaces when it becomes relevant: keeping a map, reading location descriptions for clues, and staying together once group/social danger supports it.

After the first tutorial lane, prefer adding short branches that teach the core loop and attention to the world: movement, `Озирнутися`, `Роздивитися`, visible signs, small finds, stamina, rest, safety, social signals and observation. Deeper combat, crafting and economy should wait until the player can already read and inhabit the frontier.
