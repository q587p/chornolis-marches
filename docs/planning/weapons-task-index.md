# Weapons task index

## Why now

Weapons are not being promoted as full combat. The useful near-term slice is smaller:

- a starter knife;
- one equipped weapon/tool slot;
- visible held weapons in character and target descriptions;
- freshening requires a blade;
- attack copy changes when a weapon is equipped;
- hunters can visibly use spears instead of only generic creature strength/faction text.

This connects to existing inventory, corpse freshening, hunter/NPC inventory and `look` / `examine` systems without pulling full combat forward.

## Recommended order

1. `WPN-001` — catalog, resource types, equipped fields, player equip/unequip.
2. `WPN-002` — weapon-aware `look` / `examine`, `attack`, `freshen`.
3. `WPN-003` — themed NPC seeded weapons and hunter spear attack text; do this immediately after WPN-002 if the weapon MVP still has room, otherwise keep it as near-term backlog.
4. Keep `WPN-004` cold until item-instance groundwork is real.
5. Keep `WPN-ICE-001` in icebox until full combat is intentionally promoted.

## Near-term guardrail

Do not widen target eligibility in the weapon MVP. If an animal is currently attackable, it may get weapon-aware text. If predators, players or complex NPC combat are not currently attackable, weapons should not make them attackable.

## Files likely touched by WPN-001/WPN-002

```txt
prisma/schema.prisma
prisma/migrations/*
prisma/data/world/resourceTypes.json
prisma/data/world/uniqueCreatures.json
prisma/seed.ts
src/services/weapons.ts
src/services/actionCompletions.ts
src/services/targets.ts
src/services/locations.ts
src/services/inventoryUse.ts
src/ui/inventoryItemKeyboard.ts
src/handlers/player.ts
src/handlers/start.ts
```

## Things easy to forget

- Dropping an equipped weapon must unequip it.
- Existing players need a safe starter-knife backfill path or a deliberate “new players only” decision.
- Weapon display must respect visibility/light rules already used by look/examine.
- The current torch system is already a held-item signal; do not break torch visibility.
- The MVP may allow weapon + torch at once. Model hand conflicts later.
- Freshen should validate weapon at completion time, because queue state can change before the action resolves.
- Weapon and equipped-tool nouns should be lexicon-backed. The MVP weapon keys already have forms in `src/content/lexicon/worldLexicon.ts`; future weapons should add full case forms there and route display/action text through shared weapon/grammar helpers instead of inferring from `ResourceType.name` or local maps.
- Event logs should include weapon key where useful.
- Creature seed should not equip a weapon key unless the creature resource list contains it.
