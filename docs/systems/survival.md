# Survival System

## Goals

Survival should add pressure, atmosphere and decisions, not repetitive punishment.

## Planned Systems

- Hunger.
- Fatigue.
- Rest.
- Knockout / unconsciousness at 0 HP.
- Campfires.
- Firewood gathering.
- Light and warmth.

## Rest Posture

Basic `Відпочити` / `/rest` means sitting down for a short recovery, not sleeping.

Player-facing and observer text should treat rest as posture:

- actor text: `Ви присіли відпочити.` / `Ви сидите.`;
- observer/location text: `Такий-то сидить.`;
- when the player takes another action or rest completes, they stand up implicitly before acting.

Later systems can add lying down and ordinary sleep as separate states. Tutorial sleep is a special dream/onboarding state, not the same as ordinary rest.

## Stamina Recovery Tempo

Current tuning favors quick recovery during early testing:

- passive stamina recovery: `+13` once per 40 world ticks;
- active rest stamina recovery: `+13` once per 4 world ticks;
- local features such as tutorial dream campfires can multiply active rest recovery and raise the temporary rest cap.

These values are balance constants, not final design. Player-facing UI should still prefer descriptive stamina states unless technical details are enabled.

## First Inventory Uses

0.11.12 adds the first small practical use for gathered resources from inventory:

- berries can be eaten to restore a small amount of stamina and ease hunger by a tiny amount;
- mushrooms can be eaten to ease hunger a little;
- herbs can be used when wounded to restore a small amount of HP.
- carried resource stacks can be inspected or dropped as a first simple item-action pass.

These effects are intentionally modest and player-facing text should stay descriptive. Fuller food, cooking, medicine, herbalism, potions and prepared remedies remain later systems.

## Hunger Direction

Hunger currently rises mainly from strenuous player actions and can be eased by simple food. Player-facing text should describe it atmospherically, not as a debug value.

When in-world time becomes more complete, hunger should also rise naturally with the passage of game time, so eating matters even for characters who are only traveling, waiting or resting between harder actions.

## Meat Loop

0.13.3 adds the first hunting/scavenging food loop:

1. freshen a relatively fresh corpse;
2. receive universal raw meat for now, with first simple yields by species;
3. cook raw meat at a nearby campfire;
4. eat cooked meat to ease hunger by `5`.

A torch should not be enough for cooking. The first cooking pass is imperfect: roughly three attempts out of five become cooked meat, while failed attempts consume the raw meat for now. Later systems can split meat by species and add bones, hide, fur, feathers, freshness, spoilage, tools and skill-based yields.

## Campfire Loop

1. Gather firewood in forest regions.
2. Start a campfire.
3. Campfire provides light.
4. Campfire improves rest.
5. Campfire may attract or repel creatures.
6. Rain or time can extinguish fire.

## `/respawn`

A limited early-game support command:

- returns the player to the starting location;
- available only before a defined progression threshold;
- may have cooldown;
- may apply fatigue or resource loss;
- helps new players without becoming a fast-travel system.
