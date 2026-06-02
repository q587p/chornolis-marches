---
id: OWL-004
title: Conditional owl examine copy and refrain echoes
status: proposed
type: content
area: ecology
priority: medium
estimate: 2-4h
tags:
  - owl
  - examine
  - night
  - observation
  - atmosphere
depends_on:
  - OWL-002
  - OWL-003
  - OBS-PREP-001
  - QUOTE-001
---

# OWL-004: Conditional Owl Examine Copy and Refrain Echoes

## Goal

Add rare, conditional `Роздивитися` / examine copy for owl signs or visible owls so owls can carry the refrain without making every owl magical or over-explained.

## Scope

- Add or update player-facing copy for owl signs / visible owl inspection.
- Use conditions such as dusk/night/dawn, moonlight/dark moon, fog/reduced visibility, camp edge, watchtower edge, riverbank edge or old-pine/threshold locations.
- Prefer `examine` over ordinary `look`.
- Reuse existing owl signs and boundary work where possible.
- Keep local and quiet: no proactive global chat spam.

## Candidate copy

```text
Це сова.

Принаймні, так її назвав би той, хто не дивився надто довго.
```

```text
Сова сидить нерухомо, хоч гілка під нею ворушиться від вітру.

Її очі не блищать у темряві.
Вони чекають, доки блиснете ви.
```

```text
З-за межі вогню озивається сова.

У таборі від цього не стає темніше.
Але край світла здається ближчим.
```

## Out of scope

- Flight, perches, nests, eggs or reproduction.
- Turning the starter camp into a predator trap.
- Full observation learning.
- Directly repeating `«Сови не ті, ким здаються»` in ordinary awake locations.

## Acceptance

- Ordinary day owl/sign inspection remains quiet or practical.
- At least one special owl examine line can appear under documented conditions.
- The direct quote is not repeated outside the dream threshold.
- Any new content respects existing OWL-002/OWL-003 guardrails.
- Tests cover any changed condition helper or seeded content invariant.

## Suggested validation

- `node scripts/test/owl-nocturnal.cjs`
- `node scripts/test/starter-animals.cjs`
- `npm test`
- `npm run build`
