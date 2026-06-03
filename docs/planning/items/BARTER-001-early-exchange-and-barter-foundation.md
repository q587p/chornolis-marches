---
id: BARTER-001
title: Early exchange and barter foundation after give
status: backlog
type: feature
area: economy
priority: high
tags:
  - barter
  - exchange
  - give
  - inventory
  - economy
  - npc
  - trade
---

# BARTER-001 — Early exchange and barter foundation after give

## Summary

Keep basic exchange/barter visible as a likely follow-up after `give`, but defer it behind the `LEARN` / `OBS` foundation. When it is promoted again, add the smallest barter foundation that can reuse the same item-resolution, target-resolution and transfer validation primitives.

The goal is not a full economy. The goal is to stop every future “hand item to someone” or “trade for something” feature from becoming a one-off command.


`GIVE-002` should land before or alongside richer barter input, because two-sided exchange will need the same inflection-tolerant item and target phrase resolution as one-way `give`.

## Scope

- Reuse `GIVE-001` item/target resolution and inventory validation.
- Define a minimal exchange intent shape, for example `обміняти <item> з <target>` or a target interaction button.
- Support one simple NPC/player-facing barter offer shape if current data allows it.
- Keep Ukrainian copy diegetic and clear: who offers, what is requested, what is given.
- Add docs explaining when to use `give` vs barter/exchange:
  - `give`: one-way transfer/gift/feeding/quest hand-in primitive;
  - barter/exchange: two-sided transfer with expected return value.
- Keep this early enough to unblock camp, helper NPC, herbalist and future settlement interactions.

## Out of scope

- Full merchant inventory.
- Dynamic prices/economy.
- Multi-item carts.
- Auction/trade between absent players.
- Reputation/faction pricing.
- Secure anti-scam confirmation flows beyond a small MVP confirmation if needed.

## Acceptance criteria

- Roadmap / `docs/planning/backlog.md` keeps exchange/barter visible as a deferred follow-up after `GIVE-001`.
- The barter foundation explicitly reuses `give` primitives rather than adding a separate parser stack.
- At least one minimal barter/exchange scenario can be represented in docs or tests, even if implementation is deferred to the next slice.
- Future features that need “give item / receive item” have a shared path to hook into.

## Suggested validation

- Planning export if this repo uses generated planning exports.
- Parser tests if any exchange command is implemented in this slice.
- Inventory/action tests if two-sided transfer is implemented.
- `npm test`.
- `npm run build`.
- `git diff --check`.
