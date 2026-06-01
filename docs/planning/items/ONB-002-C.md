---
id: ONB-002-C
title: Uncertain custom-name review status
status: testing
type: feature
area: onboarding
priority: high
estimate: 1-2h
tags:
  - onboarding
  - scribes
  - names
depends_on:
  - ONB-002-B
---

# ONB-002-C: Uncertain custom-name review status

## Goal

Make custom names clearly different from prepared scribe-approved names.

## First Scope

- Prepared names remain approved.
- Custom uncertain names get a review/pending status text.
- Player sees clear explanation.

## Acceptance

- Prepared-name flow remains fast.
- Custom-name flow does not falsely claim full approval.
- Scribe review authority is preserved.

## Progress

- 0.13.20: Prepared-name onboarding now says the name has already been checked by scribes, while custom names say they can be used immediately and still wait for later scribe review.
- Character cards reuse the same pending-review wording, so an unapproved custom name is presented as a review state rather than a hard block.
- Character-name tests cover the new prepared/custom review copy.

## Implementation Order

Do after: `ONB-002-B`.
