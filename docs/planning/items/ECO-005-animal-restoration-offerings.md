---
id: ECO-005
title: Animal restoration offerings
status: next
type: feature
area: ecology
priority: high
estimate: 2-3h
tags:
  - ecology
  - creatures
  - offerings
  - location-features
depends_on:
  - ECO-004
---

# ECO-005: Animal Restoration Offerings

## Goal

Add a first player-accessible, diegetic way to help small prey populations recover without turning the ecology safeguard into a visible spawn button.

The first version should use a shrine, small animal charm, carved burrow marker, hare stone, mouse stone or similar inspectable location feature. A player can leave a fitting offering, such as herbs plus berries, and after a delay the world may bring a small number of young prey animals into a local or starter habitat when that species is dangerously low.

## First Scope

- Add one or two authored offering features near beginner-reachable wilderness:
  - one for hares;
  - one for mice, or a shared small-prey charm if that is simpler for the first slice.
- Make the feature inspectable with text that hints at offerings without explaining hidden numbers.
- Add an offering action path, reusing or introducing aliases such as:
  - `/offer`;
  - `/offer berries`;
  - `покласти ягоди`;
  - `лишити трави`;
  - `лишити дар`;
  - `пожертвувати зайцеві`;
  - `пожертвувати мишам`.
- Consume the required items from the player inventory only when the offering is accepted.
- Queue or persist a delayed effect instead of spawning immediately.
- At send/effect time, check the relevant population threshold again:
  - if the local or regional prey population is low enough, add a bounded pair or small group of young animals;
  - if the population is already healthy, keep the result atmospheric and non-farmable.
- Add cooldowns or per-feature pending state so repeated offerings cannot become a spawn shop.

## Acceptance

- Players can inspect the feature and understand that a small living gift may matter.
- A valid offering removes the required items and records a delayed restoration attempt.
- A delayed restoration attempt can create young hares or mice only when the configured population is critically low.
- A healthy population blocks extra spawning while still giving a diegetic response.
- Duplicate offerings cannot stack unlimited pending restorations on one feature.
- Tests cover accepted offering, missing item rejection, delayed low-population restoration and healthy-population no-spawn behavior.

## Later Direction

- Richer shrine/kapyshche systems with spirits, calendar days, dreams, omens and reputation.
- Different offering recipes by region, season and spirit.
- Visible signs before animals return: tracks, disturbed grass, distant movement, dream-mutter from Дід Лісовик.
- Stronger consequences for exploitative overhunting where offerings help only slowly or partially.

## Non-Goals

- Full ritual or religion system.
- Guaranteed immediate animal spawning.
- Complex economy or shop-like exchange rates.
- Replacing the quiet `ECO-004` population floor safeguard.
