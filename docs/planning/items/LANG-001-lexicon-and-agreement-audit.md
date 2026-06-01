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
- shared case, actor-gender and agreement helpers in `src/services/grammar.ts`;
- local display-name maps for resources and corpses;
- hardcoded nominative strings in UI helpers;
- small local gender/verb helpers that should migrate to the shared grammar layer once reused;
- fallback grammar guesses for ad hoc names.

## Scope

- Search common player-facing surfaces for agreement issues: inventory, target inspection, location details, resource pickup/drop, cooking/freshening, fire/light and admin-visible character cards.
- Check whether stable nouns already exist in `src/content/lexicon/worldLexicon.ts`.
- Add missing stable nouns before adding more local hardcoded display maps.
- Treat weapons and equipped tools as stable lexicon nouns, not as one-off `ResourceType.name` strings. New weapon keys should add full case forms and grammar metadata before they appear in inventory, equipped-item, attack, freshening, drop/pickup or NPC description text.
- Prefer lexicon-backed helpers when a text path needs case, gender or animacy.
- Keep shared Ukrainian agreement helpers in `src/services/grammar.ts` or a deliberately named grammar submodule; avoid adding new parallel `ukrainianVerb`-style utility files under `utils/`.
- Keep broad cleanup behavior-preserving and split into small testable passes.

## Acceptance

- A short audit list identifies the remaining local resource/corpse display maps and the safest migration order.
- At least the most visible inventory/location resource summaries use gender-aware qualitative amount text.
- New stable resource, creature, profession, spirit and feature nouns have lexicon entries before being used in generated text.
- New weapon/equipped-tool display paths use lexicon-backed forms instead of inferring cases from a nominative resource name.
- New shared case/gender/verb agreement logic has a clear home in the grammar layer and is not duplicated in feature-local utilities.
- Focused tests cover representative masculine, feminine, neuter and plural agreement examples.
