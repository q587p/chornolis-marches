# 09 — Open Questions / Things to Verify Against Repo

These items should be verified against the current repository before implementing.

## Project state

- Current structure of `src/services/calendar.ts`, `src/handlers/start.ts`, and `src/services/actionQueue.ts`.
- Whether `AGENTS.md` already exists in repo root.
- Current exact commands in `package.json` for build/test/lint/typecheck.
- Current Prisma schema and seed behavior.

## Design decisions still flexible

- Whether future code should migrate all player-facing Stamina labels to `Снага`.
- Which existing HP/body-state labels should migrate first to `Життя` / `Стан`.
- Which existing inventory labels should migrate first to `Речі` / `Поклажа`.
- Exact mechanics of skill progression through use and observation.
- Exact model for fear/cowardice, escape, and animal agility.
- How much of the ecology simulation belongs in MVP vs later phases.
- Whether dream onboarding uses лісовик, animal helper, домовик-like helper, or another liminal figure.
- Whether bridge supernatural content is ambient flavor, tutorial, quest, or future event hook.

## Implementation warnings

- Do not introduce hidden migrations accidentally.
- Do not make destructive DB reset suggestions casually.
- Do not expose too many debug numbers in normal player UI.
- Do not overwrite existing text style with generic machine-translated Ukrainian.
