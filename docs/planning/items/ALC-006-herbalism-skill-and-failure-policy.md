---
id: ALC-006
title: Herbalism skill and brewing failure policy
status: testing
type: feature
area: learning
priority: high
estimate: 2-4h
tags:
  - herbalism
  - alchemy
  - learning
  - failure
  - bottles
  - crafting
depends_on:
  - LEARN-001
  - RECIPE-001
  - ALC-002
---

# ALC-006: Herbalism Skill and Brewing Failure Policy

## Goal

Add a separate `herbalism` / `Знахарство` skill policy for brewing prepared remedies so tincture-making is learned through practice, observation and mistakes rather than guaranteed by simply having ingredients.

## Design Decision

- `gathering` / `збирання` means finding and collecting herbs, berries and mushrooms.
- `cooking` / `готування` means ordinary food preparation.
- `herbalism` / `знахарство` means turning gathered resources into prepared remedies: tinctures, draughts and later more careful herbal preparations.
- A character can be good at gathering herbs but still inexperienced at making tinctures.

## First Use

- Revised `ALC-001` stamina tincture must use this policy.
- Future `ALC-003` healing/night-sight draughts should reuse it.

## Outcome Model

### Success

- consumes ingredients;
- produces the prepared tincture/draught;
- records herbalism practice if learning storage is available.

### Ordinary Failure

- consumes herbs/berries/reagents;
- keeps the empty bottle;
- produces no tincture;
- records herbalism practice.

### Critical Failure

- consumes herbs/berries/reagents;
- breaks or consumes the empty bottle;
- produces no tincture;
- records herbalism practice, possibly slightly more than ordinary failure.
- Do not add HP damage from broken glass in the first pass unless a later task explicitly adds risky injury.

### Failed Validation

Missing bottle/ingredients, full stamina when drinking, invalid location, unavailable action and similar validation failures should not consume anything and should not count as practice.

## Suggested First Tuning

Use internal skill level `0..5` from the existing learning model.

| Herbalism level | Success | Ordinary failure | Critical failure |
|---|---:|---:|---:|
| 0 | 45% | 50% | 5% |
| 1 | 55% | 42% | 3% |
| 2 | 68% | 30% | 2% |
| 3 | 78% | 21% | 1% |
| 4 | 88% | 11% | 1% |
| 5 | 95% | 5% | 0% |

If this feels too generous in live testing, the first level can be made harsher later, but keep the first implementation understandable and not punitive.

## Learning Rows

Practice:

```text
skillKey: herbalism
sourceKey: practice
contextKey: brew:herbal_tincture
```

Observation:

```text
skillKey: herbalism
sourceKey: observation
contextKey: brew:herbal_tincture
```

Suggested practice amounts:

- success: `+2`;
- ordinary failure: `+1`;
- critical failure: `+2`;
- mentored/guided practice: optional `+1` bonus or separate context, only if needed.

## Player-Facing Tone

- Do not expose raw chances, levels, thresholds or exact totals.
- Use qualitative copy: hands, smell, bitterness, sediment, timing, cracked glass, remembered mistake.
- Keep raw values admin/debug only.

Example ordinary failure copy:

```text
Трави дають запах, але не силу. Настоянка мутніє й осідає на дні, перш ніж ви встигаєте зрозуміти, що саме зробили не так.
```

Example critical failure copy:

```text
Ви стискаєте пляшечку саме тоді, коли суміш різко теплішає. Скло клацає під пальцями й дає тріщину. Гіркий сік іде в глину, а в руці лишається тільки мокрий блиск уламків.
```

## Guardrails

- No public `/skills` sheet.
- No broad alchemy tree.
- No full potion economy.
- No raw success percentages in ordinary UI.
- No HP damage from critical failure in the first pass.
- No dirty-bottle washing, thirst or water dependency yet.
- Do not let tutorial dream resources become a grind source.
- Do not make early failure so harsh that players stop experimenting.
- Do not let critical failure break non-bottle tools unless later designed.

## Acceptance

- The first stamina tincture has a documented success/failure/critical-failure policy.
- `herbalism` is documented as a separate skill from gathering and cooking.
- Ordinary failure keeps the bottle; critical failure can break it.
- Success and failure can both teach through the learning service.
- Player-facing text stays qualitative.
- Tests for the eventual implementation should cover success, ordinary failure, critical failure, failed validation with no consumption, bottle return/break behavior and no raw-key leaks.
## Implementation Notes

- Added `src/services/herbalism.ts` as the pure brewing outcome policy foundation.
- The service defines `herbalism` / `знахарство`, practice/observation source keys and the first `brew:herbal_tincture` context key.
- The first outcome table uses deterministic permille rows for levels `0..5`, clamps invalid levels and exposes a deterministic roll helper for tests.
- Practice amounts are policy-only for now: success `+2`, ordinary failure `+1`, critical failure `+2`; failed validation records no practice and is not a rolled outcome.
- Consumption policy is descriptive only: success consumes inputs and produces output, ordinary failure keeps the empty bottle, critical failure can consume/break it.
- Qualitative Ukrainian outcome copy avoids raw chances, raw level names and technical outcome keys.
- This slice does not add `/brew`, `herbal_tincture`, live resource consumption, stamina restoration, dirty bottles, water/thirst, NPC brewing, public skill UI, Prisma schema or migrations.
- Testing note: deterministic `rollHerbalismBrewOutcome(...)` coverage is the hard requirement for the policy table. If `randomHerbalismBrewOutcome(...)` remains a convenience wrapper around RNG when ALC-001 connects live brewing, cover it with injected/fixed RNG or a focused wrapper test so the player-facing path does not rely only on `typeof function` coverage.
