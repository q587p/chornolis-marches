---
id: LANG-001
title: Lexicon and agreement audit
status: backlog
type: chore
area: content
priority: medium
tags:
  - ukrainian
  - lexicon
  - grammar
  - text
---

# LANG-001: Lexicon and agreement audit

## Goal

Audit recurring Ukrainian gameplay text for noun agreement, case forms and lexicon usage, then move stable nouns and display helpers toward the shared lexicon/grammar layer.

## Problem

Some resource and inventory text is still assembled from local display-name maps and generic qualitative words. This can produce agreement errors such as a neuter resource receiving a masculine amount phrase.

The immediate `смажене м'ясо: лише один` case is fixed in the inventory target summary path, but the broader codebase still has mixed approaches:

- stable nouns in `src/content/lexicon/worldLexicon.ts`;
- local display-name maps for resources and corpses;
- hardcoded nominative strings in UI helpers;
- fallback grammar guesses for ad hoc names.

## Scope

- Search common player-facing surfaces for agreement issues: inventory, target inspection, location details, resource pickup/drop, cooking/freshening, fire/light and admin-visible character cards.
- Check whether stable nouns already exist in `src/content/lexicon/worldLexicon.ts`.
- Add missing stable nouns before adding more local hardcoded display maps.
- Prefer lexicon-backed helpers when a text path needs case, gender or animacy.
- Keep broad cleanup behavior-preserving and split into small testable passes.

## Acceptance

- A short audit list identifies the remaining local resource/corpse display maps and the safest migration order.
- At least the most visible inventory/location resource summaries use gender-aware qualitative amount text.
- New stable resource, creature, profession, spirit and feature nouns have lexicon entries before being used in generated text.
- Focused tests cover representative masculine, feminine, neuter and plural agreement examples.
