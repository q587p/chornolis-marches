---
id: GIVE-002
title: Ukrainian inflection-tolerant give parser and grammar bridge
status: testing
type: technical
area: input
priority: high
tags:
  - give
  - input
  - parser
  - ukrainian
  - grammar
  - lexicon
  - inventory
  - targets
  - barter
---

# GIVE-002 — Ukrainian inflection-tolerant give parser and grammar bridge

## Summary

After the minimal `GIVE-001` path exists, improve `give` so Ukrainian item and target phrases do not require one rigid canonical form. This remains a staged parser/grammar task for fuller `give`, barter and quest hand-ins, but `0.15.12` lands the first narrow supported slice for raw meat and the camp spirit cat.

The goal is that commands like `give сире м’ясо коту`, `дати м’яса коту`, `дати мясо кіт`, and `дати сирого м’яса бережнику` can resolve to the same transfer intent when the item and target are otherwise unambiguous.

## Design intent

Do not implement this as cat-specific string matching. Reuse and extend the existing project lexicon, Ukrainian grammar helpers, target resolution and item/resource naming rules wherever possible. The cat should be just the first visible example; the same parser should later support gifts, quest hand-ins, helper interactions, settlement exchange and barter.

## Desired parser behavior

Accept reasonably common Ukrainian variants for `give <item> <target>`:

- canonical English/slash command: `/give сире м’ясо коту`;
- slashless Ukrainian command: `дати сире м’ясо коту`;
- genitive/partial item phrase: `дати м’яса коту`;
- apostrophe-less input: `дати мясо коту`, `дати сирого мяса бережнику`;
- rough nominative target fallback when unambiguous: `дати мясо кіт`;
- dative target forms: `коту`, `котові`, `бережнику`, `бережникові`;
- hyphenated target names or aliases, for example `коту-бережнику`, `котові-бережнику`, or a custom hyphenated cat display name/epithet if one is used;
- adjective case variants for common items, for example `сире м’ясо`, `сирого м’яса`, and short/partial `м’яса` when exactly one supported meat item fits.

## Normalization requirements

- Normalize Ukrainian apostrophe variants before matching: `’`, `'`, `ʼ`, backtick-like input if already normalized elsewhere, and missing apostrophe in common words such as `мясо`.
- Normalize simple whitespace, punctuation and Telegram button/text differences.
- Prefer existing lexical entries for resource/item keys over new one-off regexes.
- Prefer existing target aliases, display names and grammar forms over hardcoded `cat` strings.
- Keep enough of the original phrase for good Ukrainian error copy.

## Ambiguity rules

The parser may accept incomplete or grammatically rough input only when it is safe:

- If one visible target clearly matches `кіт` / `бережник`, resolve it.
- If multiple visible cats/keepers/targets match, ask for clarification or show target buttons instead of guessing.
- If `м’яса` could mean several inventory stacks/items after future item expansion, prefer a clarification path.
- If the player has no matching item, fail without changing inventory and mention the understood item phrase if helpful.
- If the target is not visible/nearby/eligible, fail through the ordinary target validation path.

## Scope

- Extend parser tests for Ukrainian `give` variants.
- Add or reuse item/resource lexical forms for raw meat.
- Add or reuse target grammar forms for cat / camp guardian naming.
- Add a small normalization helper only if no existing helper already covers apostrophes and Ukrainian forms.
- Route `/feed_raw_meat` and `/feed_raw_meet` through the same canonical `give` intent, but do not depend on those aliases for normal Ukrainian input.
- Document the supported examples in command/input docs when the implementation lands.

## 0.15.12 implementation note

The first implemented slice canonicalizes common raw-meat phrases and camp-cat target forms into the same `give raw meat cat` intent:

- `/give сире м’ясо коту`;
- `дати сире м’ясо коту`;
- `дати м’яса коту`;
- `дати мясо кіт`;
- `дати сирого м’яса бережнику`;
- `дати сирого мяса котові-бережнику`.

This intentionally stays narrow: only the already-supported raw-meat-to-camp-cat transfer is canonicalized. Broader inventory transfer, barter, multiple target ambiguity UI, item instance selection and richer Ukrainian grammar remain future parts of `GIVE-002`, `GIVE-003` and `BARTER-001`.

## Out of scope

- Full natural-language understanding.
- Arbitrary word-order parsing for every Ukrainian sentence.
- Two-sided barter confirmation; that belongs to `BARTER-001` and later exchange tasks.
- Large item grammar coverage for every future resource; start with the forms needed by raw meat and make the shape reusable.
- Silent guessing when multiple valid items or targets fit.

## Acceptance criteria

- These examples parse to the same intended item/target when unambiguous:
  - `/give сире м’ясо коту`;
  - `дати сире м’ясо коту`;
  - `дати м’яса коту`;
  - `дати мясо кіт`;
  - `дати сирого м’яса бережнику`;
  - `дати сирого мяса котові-бережнику` if the cat has a matching hyphenated alias/name.
- Apostrophe variants and missing apostrophe in `м’ясо` do not break the parser.
- Target case variants for `кіт` / `бережник` resolve through shared target lexicon/grammar, not cat-only command code.
- Ambiguous item or target phrases do not remove inventory and produce a clarification or safe failure.
- Existing canonical `GIVE-001` behavior and feed aliases still pass.

## Suggested validation

- `node scripts/test/give.cjs` or equivalent focused parser/action test.
- `node scripts/test/input-aliases.cjs`.
- `node scripts/test/slashless-command-coverage.cjs`.
- `node scripts/test/ukrainian-verb.cjs` if verb/grammar helpers are touched.
- `node scripts/test/text-targets.cjs` or target-resolution coverage for inflected/hyphenated target names.
- `node scripts/test/meat.cjs` if raw meat lexical forms or resource names are touched.
- `npm test`.
- `npm run build`.
- `git diff --check`.

## Implementation order

Do after `GIVE-001`, once the basic transfer path exists. Prefer doing it before full barter/exchange UI, because later barter commands will benefit from the same item/target phrase resolution.
