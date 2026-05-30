---
id: ONB-003
title: Tutorial player wellbeing aside
status: backlog
type: ux
area: onboarding
priority: medium
tags:
  - onboarding
  - tutorial
  - wellbeing
  - sleep
depends_on:
  - ONB-001
---

# ONB-003: Tutorial player wellbeing aside

## Goal

Add one deliberately gentle fourth-wall tutorial aside where the dream briefly addresses the player, not only the character.

## Problem

The tutorial dream already teaches character survival: rest, stamina, hunger and food. It can also carry a small human reminder without becoming a generic health popup: players also need water, food, rest, stretching and looking away from screens.

This should feel like the dream noticing the person behind the character for one breath, then letting the world continue.

## Scope

- Trigger once in the tutorial dream, preferably after the player's first tutorial rest or first food/eating moment.
- Make it clearly one-time or very rare.
- Do not send it as a standalone delayed push.
- Do not repeat it as an idle reminder, hunger reminder or AFK return line.
- Keep it optional-feeling and kind, not scolding.
- Avoid medical or moralizing wording.
- Record a small tutorial flag so it does not repeat across repeated tutorial visits.

## Candidate Copy

```text
Сон на мить дивиться не на тіло в Порубіжжі, а крізь нього - туди, де сидите ви.

«Тіло по цей бік теж треба берегти. Води. Їжі. Короткого перепочинку. Розім'яти плечі, відвести очі від екрана й подивитися в далечінь, хоч би у темне вікно. Чорноліс почекає кілька подихів».
```

Shorter variant:

```text
Сон на мить дивиться крізь персонажа - просто на вас.

«Нагадую: тілу по той бік теж потрібні вода, їжа, перепочинок і трохи далечіні для очей. Чорноліс почекає кілька подихів».
```

## Acceptance

- The aside appears at most once per player unless a scribe resets tutorial progress.
- The aside only appears as part of an active player response in the tutorial.
- It does not fire for AFK or ended sessions.
- The copy keeps the Chornolis tone while clearly addressing the player.
- Tests or a focused helper check cover the one-time flag if this becomes a helper.
