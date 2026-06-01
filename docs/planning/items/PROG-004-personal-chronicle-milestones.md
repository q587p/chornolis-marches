---
id: PROG-004
title: Personal chronicle milestones
status: next
type: feature
area: progression
priority: high
estimate: 2-4h
tags:
  - journal
  - chronicle
  - milestones
  - cooking
  - learning
  - personal-history
depends_on:
  - FOOD-001
---

# PROG-004: Personal Chronicle Milestones

## Goal

Add a private personal chronicle for memorable repeated actions, successes and failures.

This should feel like the character's lived record, not a generic achievement system. The point is to preserve small stories such as "I have burned an alarming amount of meat" alongside first successes, hard-learned habits and other recurring patterns.

## Player Story

As a player, when my character repeatedly succeeds or fails at something, I want the game to remember it in a personal літопис so the character's history becomes specific and funny, not just a set of hidden counters.

## First Scope

- Add chronicle milestone definitions with stable keys, thresholds and text templates.
- Add the counter/stat recording layer early, even if the full private chronicle UI lands later.
- Store private chronicle entries per player with:
  - milestone key;
  - threshold/count reached;
  - world date/time if available;
  - real timestamp;
  - optional location/action context.
- Start with a small set of food/action milestones:
  - first lit campfire;
  - `10` lit campfires;
  - `100` lit campfires;
  - first successfully cooked meat;
  - first failed/burnt meat;
  - `5` burnt meat failures;
  - `50` burnt meat failures;
  - first eaten cooked meat.
- Add a few non-food examples once the structure exists:
  - first successful gather;
  - repeated failed gather attempts;
  - first freshened corpse;
  - repeated failed attacks or narrow survival moments.
- Show entries through a future personal `journal` / `літопис` command or a section in the character card until the full journal command exists.
- Until the journal surface exists, make the raw milestone counters inspectable for scribes/admins so repeated actions are not lost.

## Tone Notes

- Entries should be diegetic and concise.
- They may be wry or gently personal, but should not mock the player harshly.
- Example direction:

```text
У літописі з’явився новий рядок: п’ять шматків м’яса вже стали чорним крихким уроком.
```

- Avoid loud achievement copy such as "Badge unlocked" or global trophy language.

## Non-Goals

- Public leaderboards.
- Global achievement popups.
- Full skill/progression storage.
- Social comparison between players.
- A complete journal UI if a small character-card section is enough for the first pass.

## Acceptance

- Chronicle entries are private to the player unless explicitly shared later.
- The same threshold writes only one entry per player.
- Fire-lighting statistics are recorded for first, tenth and hundredth campfire lighting.
- Cooking failure milestones include at least `5` and `50` burnt meat failures.
- Successful and failed actions can use the same milestone service.
- Entries include enough date/context to answer "when did this happen?"
- Tests cover duplicate prevention and at least the burnt-meat milestone thresholds.
