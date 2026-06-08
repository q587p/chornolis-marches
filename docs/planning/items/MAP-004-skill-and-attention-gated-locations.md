---
id: MAP-004
title: Skill and attention gated locations
status: testing
type: feature
area: world
priority: high
estimate: 2-4h
tags:
  - map
  - learning
  - skills
  - attention
  - exploration
  - cellar
  - tracking
depends_on:
  - LEARN-001
  - LEARN-002
  - MAP-003
---

# MAP-004: Skill And Attention Gated Locations

## Goal

Let some waking-world locations be reachable only when the character has enough relevant practice, attention, or personal progress to notice and use the way in.

This should not feel like a dry “requires level 3” lock. It should feel like the world asks for a steadier hand, a sharper eye, a remembered route, or the kind of bodily knowledge that comes from doing and watching.

## First Slice In Testing

`0.15.35` adds the first runtime proof as a deliberately small light/examine gate rather than a broad skill framework:

- Source: `start_border_cellar` / `Погріб прибулих`.
- Feature: `start_cellar_root_gap` / `Щілина під старим коренем`.
- Destination: `start_cellar_root_pocket` / `Коренева кишеня під погребом`.
- Gate: in darkness the feature stays a vague dark patch; when existing light/visibility rules allow feature detail, `/examine` can reveal the careful `Пролізти` (`/crawl`) action.
- The entry is an authored hidden `INSIDE` edge for seed consistency, but it is not shown as an ordinary visible exit.
- The destination is safe, has a visible return and does not add loot/resources.

This proves the MAP-004 runtime pattern in a low-risk way: location access can depend on attention and light without becoming a new tutorial, shop, cache or auto-follow path.

`0.15.37` adds the second runtime proof through a different attention path: fresh tracks and clear follow route-memory.

- Source: `meadow_16_05` / early dry meadow.
- Feature: `meadow_16_05_animal_run` / `Прим’ята трава`.
- Destination: `meadow_16_05_grass_run` / `Низький звіриний лаз`.
- Gate: the feature stays vague without a fresh trace; fresh visible `WorldTrack` rows or a recent clear follow-route memory from the same location can reveal `Пройти за слідом` (`/follow_trace`).
- Hidden water-word route memory does not count for this ordinary track gate.
- The entry is an authored hidden `INSIDE` edge, while the return is a visible `OUTSIDE` edge.
- The destination is safe and has no resource nodes, loot cache, combat hook or economy loop.

This keeps MAP-004 from becoming light-only: some hidden spaces can answer to track reading and attention to movement while still requiring an explicit player action.

## Next Slice Candidate

Add one small starter-adjacent cellar side room as a skill/progress proof of concept.

Suggested shape:

- Source: `start_border_cellar` / `Погріб прибулих`, or another starter-adjacent waking-world space that does not block onboarding.
- Destination: a tiny additional room or niche under the starter infrastructure, for example:
  - `Засипана комірчина`;
  - `Суха бокова комірка`;
  - `Низька трав'яна ніша`.
- Access condition: enough early gathering/herbalism progress, roughly comparable to the starter herbalist baseline, using the existing learning/progress helpers where possible.
- If the player does not yet meet the condition, block access with atmospheric copy:
  - the wall/roots/shelf almost make sense, but the hands do not yet know where to press;
  - the dry bundles and old herb marks are not hiding from the player, exactly, but they are not ready to answer;
  - train through gathering, observing herbalists and returning later.
- Do not expose raw skill level, exact thresholds or debug counters in ordinary text.

Example refusal tone:

> Ви знаходите місце, де глина ніби відступає під пальцями, але рух ще не складається. Погріб не зачинений перед вами; просто руки ще не навчилися просити його правильно. Позбирайте трав, придивіться до тих, хто це вміє, і поверніться.

## Scope

- Add a reusable access-check helper for authored location/exit gates based on:
  - skill key and minimum internal level/progress;
  - personal progress flags or remembered routes;
  - attention state, such as recent `/examine`, follow intent, track memory or observed demonstration;
  - explicit allowlist for scribe/admin debug bypass only if needed.
- Keep the first implementation narrow and authored, not a generic lock framework for every exit.
- Route failures should be diegetic and short, with a useful next-step hint.
- Successful access should still use ordinary movement rules where possible.
- Hidden or gated paths should not appear in ordinary `/look` exits until discovered/available.
- If a feature hints at the path, `/examine` should provide more meaning than `/look`.

## Guardrails

- Do not add character levels.
- Do not show raw learning table values to ordinary players.
- Do not make the starter cellar a loot shortcut or economy source.
- Do not block core onboarding, return-to-camp safety or tutorial completion behind a skill gate.
- Do not let hidden/gated exits become automatic follow routes without separate route-learning design.
- Do not make every map expansion gated; ordinary exploration should remain viable.

## Acceptance

- At least one authored waking-world location is gated by relevant skill or personal progress.
- A lower-progress character gets atmospheric refusal copy and a diegetic suggestion to train/observe/return.
- A qualifying character can enter through ordinary movement/action rules.
- The gate does not reveal raw thresholds in player-facing text.
- Scribe/admin docs explain how to test the gate without exposing it in public news.
- Tests cover:
  - below-threshold refusal;
  - above-threshold access;
  - no visible ordinary exit leak before access;
  - no bypass through follow-step or hidden-route replay;
  - no tutorial/dream dependency.

## Future Uses

- Tracking-gated animal paths that only become usable after enough track reading.
- Attention-gated crawlspaces that require a recent local examination or observed NPC use.
- Personal-progress gates where a character remembers a route after seeing a herbalist, hunter, fisher or spirit-adjacent action.
- Daypart/weather/season gates may combine with skill gates later, but should remain separate concerns in implementation.
