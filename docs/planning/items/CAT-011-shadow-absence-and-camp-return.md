---
id: CAT-011
title: Camp spirit cat shadow absence and camp return
status: backlog
type: feature
area: atmosphere
priority: medium
estimate: 1-2h
tags:
  - cat
  - camp
  - atmosphere
  - liminality
  - world-time
depends_on:
  - CAT-003
  - CAT-009
---

# CAT-011: Camp Spirit Cat Shadow Absence And Camp Return

## Goal

Let Кіт-бережник sometimes stop simply "looking around" when the starter camp is quiet. If there are no live camp mice to watch or hunt, he may vanish into the shadows for a couple of in-game hours, then reappear in another allowed starter-camp location.

This should make the cat feel liminal and self-willed without turning him into a companion, quest giver, warning system or ordinary animal loop.

## Scope

- Detect the quiet case narrowly:
  - Кіт-бережник is alive and within his allowed camp/watchtower/cellar boundary;
  - no visible live mice are in the relevant camp locations;
  - no current cat attack/hunt action is running or queued.
- Occasionally hide him with subtle current-action/inspection flavor such as:
  - "Кіт-бережник зникає в тінях між дошками.";
  - "Кіт-бережник не сидить біля вогню; тільки темніша пляма під стіною здається знайомою."
- Keep the absence short and world-time based: roughly a couple of in-game hours, not a permanent sleep state.
- After the absence expires, move or reveal him in another allowed starter-camp location, such as the camp, watchtower or cellar, using ordinary local boundaries rather than broad creature travel.
- Prefer hidden/currentAction markers or existing lightweight creature fields. Do not add Prisma schema or migrations.

## Guardrails

- No player reward, quest, friendship meter, pet UI or public skill numbers.
- No broad spirit system, `/spirit` unlock or mentorship behavior.
- No combat help, danger detector or exact mouse-count revelation.
- No movement outside the camp/watchtower/cellar boundary.
- No room notification spam; use inspection/currentAction and rare local visibility changes over proactive chat.
- Do not block CAT-003 mouse hunting: if mice are present, hunting/watch priority wins over shadow absence.

## Acceptance

- A focused test covers that the cat does not enter shadow absence while live camp mice are present.
- A focused test covers that absence is bounded and can expire after a couple of in-game hours.
- A focused test covers that return location stays within allowed camp cat locations and can differ from the original location.
- Visible text stays subtle and atmospheric.
- Existing cat hunting, cache presence, `/spirit`, mentorship, group movement, combat, economy, Prisma schema/migrations and WorldEventMarker stay unchanged.

## Suggested Validation

- `node scripts/test/camp-cat.cjs`
- `node scripts/test/world-seed.mjs`
- `npm test`
