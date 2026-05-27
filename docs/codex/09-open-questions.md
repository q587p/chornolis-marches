# 09 — Open Questions / Things to Verify Against Repo

These items should be verified against the current repository before implementing.

## Project state

- Current structure of `src/services/calendar.ts`, `src/handlers/start.ts`, and `src/services/actionQueue.ts`.
- Whether `AGENTS.md` already exists in repo root.
- Current exact commands in `package.json` for build/test/lint/typecheck.
- Current Prisma schema and seed behavior.

## Design decisions still flexible

- Which remaining player-facing surfaces still need cleanup toward the canonical terms in `docs/design/terminology.md`: `Снага`, `Життя` / `Стан`, `Речі` / `Поклажа`, `Місцина`, `Озирнутися`, `Роздивитися`.
- How to teach new fire/light and inventory behavior in onboarding, `/help`, fallback hints and future tutorial flow without overloading brand-new players.
- Exact first implementation of `Додати хмиз`: extend an existing timed campfire, refresh its timer, prepare fuel on an extinguished campfire, or some deliberately small combination of those.
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
