---
id: ONB-010
title: Newcomer starter kit
status: backlog
type: feature
area: onboarding
priority: medium
estimate: 2-4h
tags:
  - onboarding
  - beginner
  - inventory
  - weapons
  - food
  - torch
depends_on:
  - WPN-001
  - CAMP-003
---

# ONB-010: Newcomer Starter Kit

## Goal

Give a newly arrived character a small, diegetic starter kit so the first real
steps after onboarding do not depend on already knowing where every beginner
support feature is.

This is a safety rail for first sessions, not a shop, reward table or permanent
economy faucet.

## Candidate Contents

- One plain working knife for freshening, cutting and emergency defense.
- One simple or homemade spear-like weapon if the weapon catalog supports a
  low-tier starter spear; otherwise document why the first slice keeps only the
  knife.
- A little food, preferably simple and low-impact: berries, cooked meat or
  another beginner-safe ration.
- A small torch supply, enough to survive the first darkness mistake without
  replacing the watchtower/camp torch source.
- Optional small utility items only if already supported by systems: twigs,
  basic remedy, or a tiny note pointing back to the border camp.

## Design Questions

- Should the kit be granted directly during character creation, taken from a
  visible starter-camp feature, or represented as a one-time package in the
  shared beginner cache?
- Should existing characters receive a one-time backfill, or only brand-new
  characters?
- Should the starter spear be a new `rough_spear` / homemade item, or a weaker
  presentation of the existing spear resource?
- How should the kit interact with hand-slot work once torch + knife + spear
  display becomes stricter?

## Guardrails

- Do not add repeated hidden restock of weapons or money.
- Do not bypass the value of the starter watchtower torch source.
- Do not give high-tier weapons, large food reserves or tradeable wealth.
- Do not turn this into a full equipment/armor/combat system.
- Keep the player-facing copy diegetic: border-camp issue, not MMO loot.

## Acceptance

- A new character can receive or clearly access the starter kit exactly once.
- The kit contains a knife or other freshening-capable sharp tool.
- The kit includes enough light/food to recover from one beginner mistake, not
  enough to ignore survival/resource learning.
- Public `/me` / inventory surfaces describe the carried kit without raw debug
  fields.
- Admin/scribe item surfaces know any new resource keys added for the kit.
- Tests cover one-time grant/access and no duplicate starter-kit farming.

## Notes

This can build on WPN-001's starter knife work and CAMP-003's shared beginner
cache, but should decide explicitly whether the kit is personal inventory or
camp infrastructure. If it grants a spear, keep it visually and mechanically
modest until deeper combat/hand-slot work is ready.
