---
id: PROG-002
title: Observation-based learning
status: backlog
type: feature
area: progression
priority: medium
tags:
  - skills
  - observation
  - npc
  - animals
  - mythic
depends_on:
  - PROG-001
---

# Observation-based learning

## Goal

Allow players to learn or improve skills by watching beings that use those skills.

## Rules

- A player can discover a basic skill by observing someone use it.
- A player can improve a known skill if the observed being has a higher skill.
- Learning chance depends on relevant attribute, current skill, observed skill, visibility, attention, danger and skill gap.

## Examples

- Watch a herbalist gather herbs → unlock Herbalism.
- Watch a wolf track prey → improve Tracking.
- Watch a lisovyk cross a boundary → possible mythic insight.

## Tutorial MVP Candidate

Use the dream tutorial to prove the pattern with one narrow, scripted scene before building a full skill system.

First proof added in `0.12.8`: `Лисячий просвіт сну` contains `Лисячий рух`, an inspectable tutorial feature that writes a one-time `Tutorial observation lesson` event and shows:

```text
Ви уважно спостерігаєте.
Слідування трохи покращено.
```

This is still only a tutorial flag, not a real skill progression model.

`PROG-002` is now an umbrella design item, not the next standalone implementation slice. Near-term work should be tracked through narrower learning items such as `LEARN-*`, `OBS-*` and `TRACK-LEARN-*`, then folded back into the shared progression model when that foundation exists.

- A crow, Сон or another tutorial voice warns the player to watch carefully.
- A fox demonstrates movement, stalking or a simple attack.
- The attack lesson should be a repeatable tutorial scene on a cadence, not a one-off permanent state: a fox or fox-like shadow attacks a mouse/prey, the location briefly reports something like `Щось кидається на здобич. За мить миша падає нерухомо.`, and there is a short observation window.
- If the player examines the room, examines the fox, or otherwise watches at the right moment, show a small learning line such as:

```text
Ви уважно спостерігаєте.
Слідування трохи покращено.
```

or, during the fox attack:

```text
Ви помічаєте, як лисиця вкладає силу в короткий ривок.
Атака трохи покращена.
```

- If the player misses the window, the scene can repeat later with varied Сон/Дрімота/crow comments rather than forcing the lesson immediately.
- In the first implementation, `look` or `examine` during the attack moment can trigger the lesson; later this should depend on visibility, attention, and actual skill state.
The first implementation can write only a tutorial flag or placeholder skill progress; it does not need the full progression model yet.

## 0.13.11+ Text-Only Learning Placeholders

A text-only attack-learning bridge now exists before real skill progress rows:

- every thirteenth player kill through `ATTACK` sends the acting player `Навичка <b>атаки</b> підросла.`;
- every fifth recorded `look`/`examine` observation of a recent kill by someone else in the same location sends the observer `Навичка <b>атаки</b> трохи підросла.`;
- the bookkeeping uses hidden `WorldEvent` records and does not expose raw counters or change numeric skills.

A matching gathering bridge now exists:

- every thirteenth player gather attempt through `GATHER` or `GATHER_SPECIFIC` sends the acting player `Навичка <b>збирання</b> підросла.`;
- failed gather attempts count for practice;
- every completed player or NPC gather attempt records a hidden observation source;
- inspecting another character/NPC, examining the location, or using brief `look` while the location has active light can record one observation of a recent gather source;
- every fifth such recorded observation sends the observer `Навичка <b>збирання</b> трохи підросла.`;
- the bookkeeping also uses hidden `WorldEvent` records and does not expose raw counters or change numeric skills.

Future work should move these messages onto the shared learning/progression service so attack practice, attack observation, gathering practice and gathering observation use the same rules as Herbalism, Tracking and other teachable skills.

## First Skill Vocabulary To Consider

- Слідування / Вистежування
- Уважність
- Збирання
- Травництво
- Рибальство
- Полювання
- Скритність
- Атака
- Захист
- Виживання
- Вогонь
- Мітологія / знання межі
