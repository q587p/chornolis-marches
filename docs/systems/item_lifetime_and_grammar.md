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

0.11.12 resource-stack drops are an intentionally simple bridge: `Викинути` removes one carried resource and returns it to the current location through the existing resource-node model. A dropped lit torch remains a burning ground item, can light the місцина and can be picked up again until its timer expires; after burn-out it turns into `twigs`. If several dropped lit torches are in one stack, the whole ground stack currently shares one timer on the resource node. Later item instances should preserve origin, quality, per-item timers, freshness and richer ground-object behavior without stack-level timer compromises.

0.13.3 adds the first raw meat -> cooked meat -> eat loop as a resource-stack bridge. Future item-instance work should let meat age in inventory and on the ground until it becomes unsuitable, and should allow butchering / freshening a corpse already carried in inventory rather than only a visible corpse lying nearby.

Current 0.13.x behavior hides the original corpse after freshening so player-facing lists do not show a harvested body or expose the internal `freshened_by_player` marker. A later remains slice should replace that bridge with a real visible `рештки`/usable-remains object that has its own lifetime, drop-off behavior and text.

In the tutorial dream, berries, herbs and mushrooms may also be treated as visible loose ground resources so a beginner can see the immediate result of dropping simple dream supplies. This is a tutorial bridge, not the final item model: future item instances should track whether a stack was gathered in the dream or brought from the waking world.

Immediate pickup and drop actions should be visible to the room: nearby players receive an observer line, a world event is recorded, and the actor gets a recent-action entry for scribe/admin inspection. This currently covers loose ground resources, corpse pickup, torch-stand pickup and inventory drops.

When a character inspects a carried resource stack in `Речі`, that item card should expose the relevant direct actions for the inspected item: eating edible items, cooking raw meat when a usable fire is nearby, adding `twigs` to a nearby campfire when allowed, lighting or dousing torches when possible, and dropping the inspected item. The inventory overview can still keep broad shortcut actions, but the item card should not force the player to backtrack before acting on the thing they just inspected.

## Sex, animacy and cases

Ukrainian display text should be chosen through grammar helpers instead of hardcoded labels in gameplay code.

- Sex-aware animal forms matter for corpse names: `труп вовка`, `труп вовчиці`, `труп лиса`, `труп лисиці`.
- Player and named NPC forms should prefer stored case fields when present: nominative, genitive, dative, accusative, instrumental, locative and vocative.
- Animacy affects accusative wording: animate beings usually use genitive-like accusative forms, while inanimate objects usually keep nominative-like accusative forms.
- Corpse text is a mixed case: the corpse object itself is inanimate, but the creature name after `труп` still uses the creature's genitive form.
- Target lists and location details should also use genitive after `труп` and future `рештки`, for example `труп миші`, `труп миша` and `рештки зайця`, not nominative species names or a colon/action suffix.
- Creature eating actions should use an accusative resource form, for example `їсть траву`, not `їсть трава`.
- UI code should ask the grammar layer for a context-specific form instead of checking resource keys such as `corpse_rabbit_female` inline.

## Visible carried things

Looking at another character should describe only obvious visible state: name, posture/state and what is openly carried or burning in hand. A fuller `examine` may show carried inventory or field supplies when the game has a reason to surface them, such as visible player resources, current hunter torch bundles or hunter-claimed carcasses. Ordinary player-facing text should use approximate amounts (`трохи`, `чимало`, `багато`) rather than exact counts; exact inventory counts belong to the owner, technical-details mode or scribe/admin views. Hidden inventory, future concealed equipment and private containers should remain private unless a later skill, search rule or scribe/debug view reveals them.

- A burning torch is visible in inspection text.
- One lit torch is described as `У руці горить запалений факел.`
- Two lit torches are described as `В обох руках горять запалені факели.`
- `Руки порожні.` should appear only when the character has no obvious held item.

Future equipment should extend this same visible-appearance layer: weapons, tools, packs and clothing can be shown when they are openly carried or worn, while hidden inventory remains private unless a later skill, search rule or scribe/debug view reveals it. `WPN-005` tracks the near-term hand-slot cleanup: a character with a lit torch and a knife/spear/tool should show those as two coherent held things, NPC / local-character descriptions should use the same helper, and `Руки порожні.` must not appear while any obvious item is in either hand.
