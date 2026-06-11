---
id: ANIMAL-002
title: Animal lore through look/examine
status: backlog
type: feature
area: progression
priority: medium
tags:
  - animals
  - examine
  - skills
  - observation
  - ecology
depends_on:
  - PROG-002
  - LEARN-002
---

# ANIMAL-002: Animal Lore Through Look/Examine

## Goal

Turn repeated careful attention to animals into a qualitative animal-lore skill
surface. The player should gradually read more from `look` / `examine` of a
visible animal without exposing raw stat tables.

This is inspired by classic animal-lore ideas, but adapted to Chornolis:
less taming UI, more field knowledge, posture, hunger, signs, age, sex, fear,
injury and local ecological context.

Candidate player-facing skill names:

- `Звірознавство`
- `Тваринознавство`
- `Пізнання тварин`

Pick the final label when implementation starts, then add it to the lexicon and
learning/help surfaces.

## Current Motivation

Current animal inspect output can feel too flat:

```text
👁 Ви роздивляєтесь жабу.

Це жаба.

Стан: жива, шукає їжу.
```

A more knowledgeable character should eventually see more, still in-world:

```text
👁 Ви роздивляєтесь жабу.

Це жаба.
Стан: жива, шукає їжу.
Життя: виглядає міцно.
Стать: самиця.
Вік: доросла.
```

Later levels can add hunger, readiness to breed, recent fear, wounds, whether a
predator looks restless, whether prey is likely to flee, and similar qualitative
signals.

## Scope

- Rework animal `look` / `examine` output into gated detail bands.
- Use existing creature fields first:
  - species/forms;
  - current action/activity;
  - HP vs max HP as qualitative health;
  - sex;
  - age;
  - hunger or feeding pressure if current state supports it;
  - recent attack/fear/danger markers where already available.
- Let careful animal inspection and meaningful animal observation slowly improve
  the skill through the shared learning/progression layer.
- Keep output diegetic and qualitative:
  - `Життя: виглядає міцно.`
  - `Голод: тримається біля їжі.`
  - `Неспокій: легко зірветься з місця.`
- Keep exact numbers for scribe/admin/debug surfaces only.

## Non-Goals

- No pet/taming/control system in this slice.
- No animal command obedience, loyalty table, stable UI or veterinary healing.
- No combat rewrite.
- No public raw skill sheet or raw HP/stamina/hunger numbers.
- No Prisma schema/migration unless an implementation slice proves existing
  progress/marker storage is insufficient.
- No broad animal AI rewrite just to make text richer.

## Suggested First Slice

Start with visible animals only and no new command:

- `look` remains brief.
- `examine animal` reveals one additional detail band if the character has
  enough animal-lore progress or if the animal is very easy to read.
- Low/no skill:

```text
Це жаба.
Стан: жива, шукає їжу.
```

- Early skill:

```text
Це жаба.
Стан: жива, шукає їжу.
Життя: виглядає міцно.
Стать: самиця.
Вік: доросла.
```

- Later skill bands can add hunger, breeding, fear, injury and intention hints.

## Acceptance

- Animal `look` / `examine` output is still concise at low skill.
- Higher animal-lore progress reveals more qualitative detail without raw
  numbers.
- Skill progress can come from careful animal inspection and/or observation of
  meaningful animal behavior.
- Hidden, unclear, dark or distant animals do not grant reliable detail.
- Tests cover:
  - low-skill animal examine;
  - higher-skill animal examine;
  - no raw public numbers;
  - correct Ukrainian sex/age labels such as `самиця` and `доросла`;
  - visibility/light guardrails if the implementation touches them.
