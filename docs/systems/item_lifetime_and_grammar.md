# Item Lifetime and Ukrainian Grammar

This note records the current player-facing vocabulary for objects that age, rot, burn out or otherwise disappear from the world.

## Lifetime bands

Ordinary player UI should avoid exact remaining ticks. Exact values belong behind the local per-character technical details option.

| Remaining lifetime | Player-facing state |
|---|---|
| `<20%` | `жахливо` |
| `20-39%` | `скоро зіпсується` |
| `40-59%` | `не дуже добре` |
| `60-80%` | `середньо` |
| `>80%` | `ідеально` |

For corpses, these states describe the current condition of the body. Later perishable items can reuse the same scale for food, harvested materials, fuel, dropped supplies and crafted objects.

0.11.12 resource-stack drops are an intentionally simple bridge: `Викинути` removes one carried resource and returns it to the current location through the existing resource-node model. A dropped lit torch remains a burning ground item, can light the місцина and can be picked up again until its timer expires; after burn-out it turns into `twigs`. Later item instances should preserve origin, quality, timers, freshness and richer ground-object behavior without stack-level timer compromises.

In the tutorial dream, berries, herbs and mushrooms may also be treated as visible loose ground resources so a beginner can see the immediate result of dropping simple dream supplies. This is a tutorial bridge, not the final item model: future item instances should track whether a stack was gathered in the dream or brought from the waking world.

Immediate pickup and drop actions should be visible to the room: nearby players receive an observer line, a world event is recorded, and the actor gets a recent-action entry for scribe/admin inspection. This currently covers loose ground resources, corpse pickup, torch-stand pickup and inventory drops.

## Sex, animacy and cases

Ukrainian display text should be chosen through grammar helpers instead of hardcoded labels in gameplay code.

- Sex-aware animal forms matter for corpse names: `труп вовка`, `труп вовчиці`, `труп лиса`, `труп лисиці`.
- Player and named NPC forms should prefer stored case fields when present: nominative, genitive, dative, accusative, instrumental, locative and vocative.
- Animacy affects accusative wording: animate beings usually use genitive-like accusative forms, while inanimate objects usually keep nominative-like accusative forms.
- Corpse text is a mixed case: the corpse object itself is inanimate, but the creature name after `труп` still uses the creature's genitive form.
- UI code should ask the grammar layer for a context-specific form instead of checking resource keys such as `corpse_rabbit_female` inline.

## Visible carried things

Inspecting another character should describe only obvious visible state, not their private inventory.

- A burning torch is visible in inspection text.
- One lit torch is described as `У руці горить запалений факел.`
- Two lit torches are described as `В обох руках горять запалені факели.`
- `Руки порожні.` should appear only when the character has no obvious held item.

Future equipment should extend this same visible-appearance layer: weapons, tools, packs and clothing can be shown when they are openly carried or worn, while hidden inventory remains private unless a later skill, search rule or scribe/debug view reveals it.
