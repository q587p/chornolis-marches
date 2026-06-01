---
id: NPC-007
title: Larger hunter and herbalist line banks
status: next
type: content
area: npc
priority: high
estimate: 1-2h
tags:
  - npc
  - hunter
  - herbalist
  - ambient
  - speech
  - polish
depends_on:
  - NPC-002
  - NPC-003
---

# NPC-007: Larger Hunter and Herbalist Line Banks

## Goal

Make the first profession NPCs feel less repetitive by substantially expanding hunter and herbalist speech/ambient line banks.

Players are now spending more time mapping, watching the world and noticing repeated local lines. Hunters and herbalists should have enough short, atmospheric variants that repeated encounters feel like ongoing work rather than a tiny loop.

## Scope

- Expand hunter line pools for:
  - ordinary ambient presence;
  - hunting / route intent;
  - returning with or without prey;
  - gate/carcass-dropoff concern;
  - torch/light concern;
  - short replies to nearby player speech or fitting social signals.
- Expand herbalist / знахар line pools for:
  - ordinary ambient presence;
  - gathering and watching plants;
  - warning about overharvesting or depleted places;
  - food/medicine hints without becoming a quest giver;
  - short replies to nearby player speech or fitting social signals.
- Keep lines compact enough for Telegram.
- Keep phrasing varied by mood and situation: practical, wary, lightly folkloric, sometimes dry.
- Avoid exposing hidden numeric mechanics in ordinary NPC speech.
- Prefer profession-specific wording over generic "NPC said" lines.

## Guardrails

- Do not increase message spam. Larger banks should reduce repetition, not raise frequency.
- Do not turn hunters or herbalists into tutorial narrators unless the player explicitly interacts with them.
- Do not make them omniscient. They can know local work, danger, light, plants and nearby needs.
- Keep speech private/local according to the existing speech and ambient systems.
- Keep future localization in mind: line banks should be grouped and named clearly.

## Acceptance

- Hunters have a visibly larger set of reusable lines across at least ambient, hunting and reply contexts.
- Herbalists / знахарі have a visibly larger set of reusable lines across at least ambient, gathering and reply contexts.
- Existing ambient-line tests are extended or a focused line-bank test verifies that the minimum bank sizes do not regress.
- `npm test` and `npm run build` pass.

## Notes

This is intentionally small and near-term. It can land before deeper hunter patrol or herbalist-service behavior if it only expands existing exported line banks and tests. If the current herbalist lines are still buried in `worldTick.ts`, keep the edit modest and leave the deeper move to `NPC-003`.
