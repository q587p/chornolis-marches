---
id: DREAM-003
title: Dream outcomes and guarded rare transfer
status: backlog
type: feature
area: dreams
priority: medium
estimate: 2-4h
tags:
  - dreams
  - rewards
  - knowledge
  - item-origin
  - quests
depends_on:
  - DREAM-002
  - ITEM-001
---

# DREAM-003: Dream outcomes and guarded rare transfer

## Goal

Let dreams return knowledge, impressions and rare guarded outcomes without turning dreams into free item farming.

## First Scope

- Support dream outcomes such as knowledge flags, quest hints, skill progress or changed local/spirit mood.
- Add or reuse item-origin metadata so dream-created items are tracked.
- By default, remove dream-only resources when the dream ends.
- Allow rare real transfer only when an explicit dream rule marks the item as able to cross back.

## Acceptance

- A dream can grant a non-item outcome such as a knowledge flag.
- Dream-only items cannot casually leak into waking inventory.
- A rare transferable item needs explicit metadata/rule support.
- Tutorial dream cleanup remains safe and does not remove real waking-world resources.
- Player-facing text emphasizes memory, impression, knowledge or a strange carried remnant rather than generic loot.

## Implementation Order

Promote after dream instances and item-origin groundwork are ready.
