---
id: OBS-002
title: Visible herbalist observation moment
status: testing
type: feature
area: learning
priority: high
tags:
  - observe
  - npc
  - herbalism
  - progression
depends_on:
  - OBS-001-A
  - OBS-001-B
---

# OBS-002: Visible Herbalist Observation Moment

## Goal

Let players witness one clear herbalist action and use it as the first narrow "learning by observing" moment.

## First Scope

- Add or expose one visible herbalist action for Ведана or another herbalist.
- Add `Спостерігати` support only if the observe skeleton already exists; otherwise keep this as the visible NPC action only.
- Make the action clear enough to learn from: touching leaves, checking smell, cutting stem, rejecting unsafe mushroom.
- Add atmospheric text for actor/observer.
- No big skill sheet and no raw progress numbers.
- Avoid spam with a cooldown or recent-action check.

## Non-Goals

- No broad skill sheet.
- No raw progress numbers in player-facing text.
- No full observation-learning system in this task if the shared observe/progression foundation is not ready.
- No hidden presence or stezhnyk behavior.

## Acceptance

- A nearby player can witness the herbalist action.
- The action text clearly shows what the herbalist did.
- If observation progress is available, observing grants a small diegetic hint/progress.
- Player sees no raw numbers.
- Tests/build pass.

## 0.15.26 Slice

`0.15.26` adds the first visible herbalist supply-run MVP. A herbalist can stage through the starter cellar/watchtower, visibly prepare for an outing, gather herbs/berries/mushrooms through existing `GATHER_SPECIFIC` creature actions, then return to the cellar to sort/rest narratively.

This uses the existing gathering source / observation bridge from `/look`, `/examine` and witnessed gathering. It does not add `/observe`, follow intent, a public skill UI, real shared cellar storage or a full profession loop.

## Example Text

```text
Ведана не рве стебло одразу. Вона торкається листка, нюхає пальці
й тільки тоді зрізає рослину вище від темного вузла.

Ви не вивчили травництво.
Але тепер краще розумієте, чого не треба чіпати.
```
