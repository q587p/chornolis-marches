# 05 — Workflow and Versioning

## Hard rule: package files

Do **not** add notes like “package.json and package-lock.json are intentionally unchanged...” to public news/changelog entries. That is internal workflow context only.

If a task creates a release/version commit, bump `package.json` and `package-lock.json` in that same commit. Use the version from `package.json` as the release version, and tag releases as `vX.Y.Z`, for example `v0.12.12`.

## Preferred change delivery

When asked for a patch/archive/update:

- Prefer changed files in an archive over patch files/scripts.
- Include news/changelog/docs updates when the user asks for them.
- Preserve existing code/docs/world state.
- Do not overwrite prior functionality without explicit request.

For release/patch work that is meant to be reviewed or merged:

- Start from a separate branch, preferably with the `codex/` prefix.
- Open a PR from that branch into `main` instead of committing directly to `main`.
- The PR body should include a concise summary, validation/checks, and explicit risks or rollback notes.
- If the work is still planning-only, say that in the PR summary and do not invent gameplay risk.

## Test/build/check rule

Before git add/commit/push, run the relevant tests/checks/build where applicable.

Default checks for ordinary code/data changes:

```bash
npm test
```

```bash
npm run build
```

`npm test` currently validates world seed references and type-checks `prisma/seed.ts` without executing the seed. Treat it as important for map/world/seed/data-shape changes and useful as a general regression check when behavior touches shared game systems.

Add or extend focused tests when a new rule can be checked cheaply and repeatably, especially for:

- world seed and map invariants;
- parser/alias behavior;
- text/grammar/terminology helpers;
- input aliases and MUD-style command parsing through `scripts/test/input-aliases.cjs`;
- resource, track, queue or lifecycle rules with deterministic inputs;
- regression cases that already broke once.

Manual Telegram playthroughs are still useful for UX, but they should not be the only verification when a scriptable test is practical.

When changing `docs/planning/items/*.md`, also run:

```bash
npm run planning:export
```

Commit the regenerated `docs/planning/exports/issues.csv` and `docs/planning/exports/items.json` together with the planning item change. CI treats stale planning exports as a failed check.

## Versioning flow remembered

User preference:

1. code/structure changes first;
2. run build;
3. if the task is explicitly a release/version commit, bump `package.json` and `package-lock.json` in that same commit;
4. use the `package.json` version as the release version and expected tag, formatted as `vX.Y.Z`;
5. avoid separate manual GitHub Action commits just to bump version;
6. for version bumps, prefer proper npm-based versioning over hand-editing package metadata.

## Changelog/news rule

- Include user-facing changes only.
- For player-facing release work, update `news.md` together with `CHANGELOG.md` and release notes unless the user explicitly says not to publish a news entry.
- Changelog and release-note titles should describe the final scope of the patch/minor after follow-up fixes and additions, not only the initial change that started the version.
- Do not include internal operational reminders about package files.
- Keep changelog useful and clear.
- Avoid mentioning hidden implementation details unless they matter to users/admins.
- In public Ukrainian news, avoid exposing named characters as `NPC` or listing seeded/reserved NPC names when the player-facing point can be described diegetically, e.g. "мисливиця біля лісу" instead of a specific internal character name.
- Public English changelog and release-note entries should use repository-technical wording for mechanics: `inventory`, `HP`, `stamina`, `twigs`, `location`, `resource`, etc. Use player-facing Ukrainian terms such as `Речі`, `Життя`, `Снага`, `хмиз`, and `місцина` in Ukrainian news, UI copy, in-game text, alias examples, and terminology/design docs, not as the default English release-note vocabulary.
- When writing dated release/update entries, use the local project date and Holocene calendar year, for example `12026-05-26` instead of `2026-05-26`.

## Repo / branch facts previously mentioned

- Default branch: `main`.
- Repo: `q587p/chornolis-marches`.
- User has worked with GitHub permissions/actions including branch/file/PR operations.
