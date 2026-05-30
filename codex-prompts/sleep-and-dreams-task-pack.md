# Codex Task Pack: Sleep and Dreams

## Context

Implement only the near-term ordinary sleep slice first. Do not implement advanced lucid/group dream systems in the same PR.

Read first:

- `docs/systems/survival.md`
- `docs/systems/sleep_and_dreams.md`
- `docs/design/terminology.md`
- `docs/planning/items/SLEEP-001-lying-posture-and-lie-command.md`
- `docs/planning/items/SLEEP-002-ordinary-sleep-mvp.md`

## Hard boundaries

- Preserve `/sleep tutorial` as the tutorial dream command.
- Plain `/sleep` should mean ordinary sleep.
- `/lie` / `лягти` / `лежати` changes posture only; it does not start sleep.
- Do not use “soul” / `душа` / Christian framing for dreams.
- Do not implement forced sleep, group dreams, rare dream item transfer or place-spirit dream conflict in the near-term PR.

## Task 1 — SLEEP-001

Add lying posture and command aliases.

Acceptance:

- `LYING` posture exists beside standing/sitting.
- `/lie`, `лягти`, `лежати` set posture to lying only.
- `/sit` can sit up from lying.
- `/stand` can stand from lying.
- Physical-action guards apply while lying.
- Existing sitting/rest behavior stays intact.

## Task 2 — SLEEP-002

Add ordinary sleep MVP.

Acceptance:

- Plain `/sleep` enters ordinary sleep.
- `/sleep tutorial` still enters the tutorial dream.
- `/wake`, `прокинутися`, `прокинутись` wake from ordinary sleep.
- Sleep sets posture to lying and uses a sleep state separate from posture/rest.
- Sleep recovers Снага more strongly than rest and may slowly restore Життя.
- Sleeping blocks physical actions and suppresses ordinary local-message spam.
- Direct danger/wake messages still reach the sleeper.

## Required follow-up after planning item changes

Run:

```sh
npm run planning:export
```

Include regenerated:

- `docs/planning/exports/issues.csv`
- `docs/planning/exports/items.json`

## Suggested checks

Run the focused test suite if one exists for commands/action routing/posture. Otherwise add cheap tests around:

- alias routing for `/lie`, `/sleep`, `/sleep tutorial`, `/wake`;
- posture transition `standing -> lying -> sitting -> standing`;
- `standing -> lying -> standing`;
- ordinary sleep wake flow;
- physical action blocked while lying/asleep.

Then run the normal build/test commands used by the repository.
