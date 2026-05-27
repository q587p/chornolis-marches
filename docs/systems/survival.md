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

## First Inventory Uses

0.11.12 adds the first small practical use for gathered resources from inventory:

- berries can be eaten to restore a small amount of stamina;
- mushrooms can be eaten to ease hunger a little;
- herbs can be used when wounded to restore a small amount of HP.
- carried resource stacks can be inspected or dropped as a first simple item-action pass.

These effects are intentionally modest and player-facing text should stay descriptive. Fuller food, cooking, medicine, herbalism, potions and prepared remedies remain later systems.

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
