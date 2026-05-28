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

- A crow, Сон or another tutorial voice warns the player to watch carefully.
- A fox demonstrates movement, stalking or a simple attack.
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

The first implementation can write only a tutorial flag or placeholder skill progress; it does not need the full progression model yet.

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
