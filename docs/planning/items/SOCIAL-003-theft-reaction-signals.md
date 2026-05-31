---
id: SOCIAL-003
title: Theft reaction signals
status: backlog
type: feature
area: social
priority: medium
estimate: 2-4h
tags:
  - social
  - theft
  - signals
  - reactions
  - 0.15
depends_on:
  - THEFT-001
---

# SOCIAL-003 — Theft Reaction Signals

## Status

Planned alongside THEFT-001.

## Goal

Support detected theft reactions through ordinary social signals and existing actions instead of a separate punishment system.

## Existing useful signals

Use existing social signals where they fit:

- `glare` — visible anger/suspicion.
- `hush` — quiet warning.
- `point` — draw attention.
- `wave` / `nod` — not primary theft reactions, but useful in aftermath.

## New suggested signals

Signal ids should stay lowercase letters to match current callback patterns.

### `guard`

Label:

```text
🎒 Притиснути поклажу
```

Actor message:

```text
Ви притискаєте поклажу ближче до себе.
```

Target message:

```text
{actor} притискає поклажу ближче до себе, дивлячись на вас.
```

Room message:

```text
{actor} притискає поклажу ближче до себе.
```

### `warn`

Label:

```text
⚠️ Попередити
```

Actor message:

```text
Ви різко попереджаєте {target}.
```

Target message:

```text
{actor} різко попереджає вас.
```

Room message:

```text
{actor} різко попереджає {target}.
```

### `back`

Label:

```text
↩️ Відступити
```

Actor message:

```text
Ви відступаєте на крок.
```

Room message:

```text
{actor} відступає на крок.
```

Use `MOVE` instead when an actual location change is desired.

## Theft reaction mapping

When theft is detected:

- target may use `guard`;
- target may use `glare`;
- witness may use `point`;
- world-controlled target may use `warn` through a queued social reaction;
- thief may later use `MOVE` to flee if autonomy supports it.

## Acceptance criteria

- New signals are available from the signal menu.
- Signals are useful outside theft.
- Detected theft can trigger at least one ordinary reaction for world-controlled characters.
- Player-controlled characters are notified and can choose their own response.
- Player-facing copy uses neutral character language.
