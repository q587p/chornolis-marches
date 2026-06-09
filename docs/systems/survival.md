# Survival System

## Goals

Survival should add pressure, atmosphere and decisions, not repetitive punishment.

## Planned Systems

- Hunger.
- Fatigue.
- Rest.
- Lying posture.
- Ordinary sleep.
- Knockout / unconsciousness at 0 HP.
- Carried weight / encumbrance.
- Campfires.
- Firewood gathering.
- Light and warmth.

## Rest Posture

Characters have posture separate from active recovery and sleep:

- `posture = STANDING | SITTING | LYING`;
- `isResting` remains the separate active recovery flag;
- ordinary sleep and dream states are separate from both posture and active rest.

Basic `Відпочити` / `/rest` means sitting down and starting a short recovery, not sleeping. A character can also use `/sit` / `сісти` to sit without resting, `/lie` / `лягти` / `лежати` to lie down without sleeping, and `/stand` / `встати` to stand up. Standing up during rest interrupts the active rest.

Sitting and lying block physical actions until the character changes posture: movement, pickup, gathering, attacking, freshening, dropping, putting items into features, cooking and fire/torch handling should warn that the character must stand, then show a `Встати` action. Non-physical actions such as look, examine, speech, reply and queue/status checks remain available while sitting or lying, unless the character is actually asleep.

The physical-action allow/block list is a maintenance surface. Whenever a new player action is added, the implementation and docs should explicitly decide whether that action is physical while sitting/lying, update `postureRules`, and add or adjust focused coverage when the decision can be tested cheaply. New aliases/buttons should not bypass the same stand-up guard.

Player-facing and observer text should keep posture and rest visible:

- sitting only, actor text: `Ви сидите.`;
- sitting and resting, actor text: `Ви сидите й відпочиваєте.`;
- lying only, actor text: `Ви лежите.`;
- ordinary sleep, actor text: `Ви спите.`;
- sitting only, observer/location text: `{name} сидить.`;
- sitting and resting, observer/location text: `{name} сидить і відпочиває.`;
- lying only, observer/location text: `{name} лежить.`;
- ordinary sleep, observer/location text: `{name} спить.`;
- when rest completes or is interrupted, `isResting` becomes false but posture remains `SITTING`; the player should get a visible `Встати` action.

Runtime state changes should also be broadcast to other players in the same location: `/sit`, `/stand`, auto-standing before a physical auto action, rest start, rest stop/completion, tutorial sleep entry and tutorial wake.

Ordinary sleep and lucid dreams live in `docs/systems/sleep_and_dreams.md`. Tutorial sleep is a special dream/onboarding state and should remain explicit as `/sleep tutorial`, not a synonym for ordinary `/sleep`.

When tutorial sleep and dream posture are shown together, text should make the layering explicit: `Ви спите. Уві сні ви сидите й відпочиваєте.` Future sitting/lying extensions may allow targets such as a bench, bedroll, chair or cart; plain `/sit` and `/lie` should keep meaning sitting or lying on the ground/floor of the current location.

## Stamina Recovery Tempo

Current tuning favors quick recovery during early testing:

- passive stamina recovery: `+13` once per 40 world ticks;
- active rest stamina recovery: `+13` once per 4 world ticks;
- local features such as tutorial dream campfires can multiply active rest recovery and raise the temporary rest cap.
- ordinary sleep now has its own recovery profile: it records the in-world minute when sleep begins, can wake automatically after enough world time passes, and active campfires or bounded feature-level sleep comfort can improve sleep recovery.

These values are balance constants, not final design. Player-facing UI should still prefer descriptive stamina states unless technical details are enabled.

## First Inventory Uses

0.11.12 adds the first small practical use for gathered resources from inventory:

- berries can be eaten to restore a small amount of stamina and ease hunger by a tiny amount;
- mushrooms can be eaten to ease hunger a little, but the current bridge has a blunt 1-in-10 raw-poison risk: a bad bite consumes the mushroom, lowers HP by roughly a third without dropping the character below 1 HP in this first slice, and raises hunger by `+1` up to the cap;
- herbs can be used when wounded to restore a small amount of HP.
- carried resource stacks can be inspected or dropped as a first simple item-action pass.

When a carried resource stack is inspected from `Речі`, the item card should show direct relevant actions for that item instead of forcing the player back to the full inventory list. Current examples include eating edible items, cooking raw meat when a campfire is available, adding `twigs` to a nearby campfire, lighting/dousing torches and dropping the inspected item.

These effects are intentionally modest and player-facing text should stay descriptive. The mushroom poison risk is a temporary bridge for caution and atmosphere, not the final identification system. Fuller food, cooking, medicine, herbalism, mushroom varieties, poison effects, potions and prepared remedies remain later systems.

NPCs should eventually use the same ordinary food assumptions where practical. Hunters can turn suitable fresh carcasses into meat, cook it at a real campfire and eat when hungry. Herbalists can eat berries or mushrooms when hungry, while later herbalism/medicine work should distinguish food from remedies instead of making every gathered plant a meal.

## Hunger Direction

Hunger can rise from strenuous player actions or overexertion and can be eased by simple food. Ordinary inspection, gathering or cooking should not make the character feel instantly hungry. Player-facing text should describe hunger atmospherically, not as a debug value.

`0.15.6` adds the first internal-world-time hunger bridge: after onboarding and outside tutorial dream locations, living player characters gain `+1` hunger for each full 4 in-game hours since their last passive hunger mark, capped by `PLAYER_HUNGER_MAX`. Eating berries, mushrooms or cooked meat when they actually reduce hunger refreshes that mark. The first tick for an older character only initializes the mark so deploys do not instantly backfill a large hunger debt. If `/timeSet` or a reset moves the world clock backwards, the mark resets without adding hunger. Ended sessions (`/end_session`) advance the passive hunger marker without increasing hunger, so explicit session end is a real pause for passive hunger; AFK does not pause hunger, it only silences reminders/proactive output. This passive change is silent; threshold cue messages remain tied to explicit state changes that already go through the hunger cue layer.

`WORLD-003` remains open for the broader pass: tune the passive hunger rate after playtesting, review offline edge cases beyond explicit session presence, and audit torches, campfires, corpse/meat decay and other temporary lifetimes so they use game hours/days consistently instead of scattered real-minute assumptions.

## Meat Loop

0.13.3 adds the first hunting/scavenging food loop:

1. freshen a relatively fresh corpse;
2. receive universal raw meat for now, with first simple yields by species;
3. cook raw meat at a nearby campfire;
4. eat cooked meat to ease hunger by `5`.

A torch should not be enough for cooking. The first cooking pass is imperfect: roughly three attempts out of five become cooked meat, while failed attempts consume the raw meat for now. Later systems can split meat by species and add bones, hide, fur, feathers, freshness, spoilage, tools and skill-based yields.

Freshening is a queued physical action and currently costs `3` stamina per corpse. It can fail: mouse corpses succeed on a 4-in-5 chance, rabbit corpses on a 3-in-5 chance, and fox/wolf corpses on a 2-in-5 chance. A failed freshening attempt still spends the corpse; the body is no longer a repeatable meat source. `freshen all` / `свіжувати все` only queues one freshening action per suitable visible corpse; it does not process the whole location instantly.

After freshening, the current bridge hides the original corpse from player-facing location and target lists. Future work should create proper visible remains with their own lifetime and drop-off behavior instead of exposing internal `freshened_by_player` state.

Freshening and cooking use the same first text-only learning bridge as attack and gathering. Repeated personal freshening/cooking actions can show private growth text every thirteenth action; observing another actor's recent freshening/cooking through location or target inspection can show a smaller private growth text every fifth observation. These messages do not yet change stored numeric skills.

## Campfire Loop

1. Gather firewood in forest regions.
2. Start a campfire.
3. Campfire provides light.
4. Campfire improves rest and ordinary sleep.
5. Campfire may attract or repel creatures.
6. Rain or time can extinguish fire.

## `/respawn`

A limited early-game support command:

- returns the player to the starting location;
- `/respawn` is the player-facing command;
- requires confirmation before moving the character;
- available to early-progress or weak characters, but refuses established characters;
- has a first 30-minute real-time cooldown;
- interrupts active/queued actions and active rest;
- lowers stamina to at most roughly a third;
- writes a world event so the return is auditable;
- helps new players without becoming a fast-travel system.

If `/respawn` refuses because the character is already established, the response should still offer understandable next steps instead of leaving the player stuck. Current fallback guidance points to `Гукнути поруч` (`/yell`) so nearby characters may hear the call, and `Звернутися до Писарів` (`/call_scribes`) for a manual Scribe return sign. That sign is an auditable rescue action, not an ordinary travel command: it notifies Scribes/admins, cancels the player's active/queued actions when applied, and returns the character to the start camp only when a Scribe chooses to use it.
