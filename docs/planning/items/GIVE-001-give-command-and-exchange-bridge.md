---
id: GIVE-001
title: Generic give command MVP and exchange bridge
status: next
type: feature
area: inventory
priority: high
tags:
  - give
  - inventory
  - items
  - targets
  - exchange
  - barter
  - cat
  - telegram
---

# GIVE-001 — Generic give command MVP and exchange bridge

## Summary

Implement the first generic `give` command so item transfer is not hidden inside one-off social actions. The camp cat’s `Дати сире м’ясо` button should be the first small, visible use-case: under the hood it is `give сире м’ясо коту`.

This also moves exchange/barter groundwork earlier. `give` should become the low-level primitive that later barter, gifts, quest hand-ins and NPC exchange offers can reuse. Keep this MVP small: canonical/button forms are enough for the first slice, while rich Ukrainian inflection handling is tracked separately in `GIVE-002`.

## Player-facing command shape

Support the project’s existing parser style, but aim for these intents:

- `/give сире м’ясо коту`
- `дати сире м’ясо коту`
- `дати 1 сире м’ясо коту` if quantities are already supported or cheap
- target-button `Дати сире м’ясо`

Desired but not required for the first MVP; track in `GIVE-002`:

- `дати м’яса коту`;
- `дати мясо кіт`;
- `дати сирого м’яса бережнику`;
- apostrophe variants and missing-apostrophe Ukrainian input;
- inflected/hyphenated target aliases such as `коту-бережнику`.

Compatibility aliases for the cat slice:

- `/feed_raw_meat` → `give сире м’ясо коту`
- `/feed_raw_meet` → typo-tolerant alias for `give сире м’ясо коту`
- optional `/feed_cat` only if it already exists or is cheap; it should still route to `give`

## Scope

- `0.15.11` partial slice: add the canonical parser/handler bridge for one supported resource (`raw_meat`) to one valid target (`camp_spirit_cat`) without adding a new Prisma action enum or full barter surface.
- Add or formalize a generic `GIVE` command/action path.
- Resolve a visible nearby target by name/alias/button target id.
- Resolve a valid item/resource from the giver’s inventory using existing item naming rules.
- Use existing Ukrainian lexicon/grammar helpers where cheap, but do not block this MVP on the full inflection-tolerant parser from `GIVE-002`.
- Remove exactly the chosen quantity from the giver only after validation succeeds.
- Deliver the item/resource to the receiver or to a target-specific accept handler.
- For the camp cat, accept exactly 1 raw meat unit and queue cat `EAT` / eating cooldown after successful transfer.
- Emit clear Ukrainian private/public copy.
- Add parser/button coverage for slash, slashless and alias inputs.
- Document that feed aliases are aliases, not social actions.

## Out of scope

- `0.15.11` explicitly keeps full player-to-player transfer, NPC gifts, quest hand-ins and merchant/barter confirmation out of scope.
- Price negotiation.
- Two-sided trade confirmation.
- Full merchant UI.
- Reputation changes from gifts.
- Secure ownership/stealing policy beyond the minimal transfer validation already needed.
- Complex container-to-target transfer; start with player inventory to visible target unless existing inventory helpers make more sources cheap.

## Acceptance criteria

- A player can give one supported inventory item/resource to a visible valid target.
- Invalid item, missing item, invalid target and too-far target fail without removing inventory.
- `Дати сире м’ясо` in the camp cat UI calls the generic give path.
- `/feed_raw_meat` and `/feed_raw_meet` route to the same generic give path and are covered by parser tests.
- Cat-specific acceptance logic lives behind target acceptance / follow-up behavior, not in a social action.
- The implementation is documented as the first step toward exchange/barter.
- The backlog contains `GIVE-002` for robust Ukrainian case/apostrophe/partial-form parsing, so the MVP does not become a cat-only hardcode.

## Suggested validation

- `0.15.11`: parser/button coverage may live in `scripts/test/input-aliases.cjs` plus existing camp-cat/help tests instead of a dedicated `give.cjs` until broader transfer behavior lands.
- New `node scripts/test/give.cjs` or equivalent focused parser/action test.
- `node scripts/test/input-aliases.cjs`.
- `node scripts/test/slashless-command-coverage.cjs` if slashless variants are added.
- `node scripts/test/meat.cjs` if raw meat inventory helpers are touched.
- New or updated `node scripts/test/camp-cat.cjs` for cat-specific accept/eat behavior.
- `npm test`.
- `npm run build`.
- `git diff --check`.
