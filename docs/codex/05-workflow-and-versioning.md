# 05 — Workflow and Versioning

## Hard rule: package files

Do **not** add notes like “package.json and package-lock.json are intentionally unchanged...” to public news/changelog entries. That is internal workflow context only.

## Preferred change delivery

When asked for a patch/archive/update:

- Prefer changed files in an archive over patch files/scripts.
- Include news/changelog/docs updates when the user asks for them.
- Preserve existing code/docs/world state.
- Do not overwrite prior functionality without explicit request.

## Build/check rule

Before git add/commit/push, run a build/check where applicable, especially:

```bash
npm run build
```

If tests/checks exist and are relevant, run them too.

## Versioning flow remembered

User preference:

1. code/structure changes first;
2. run build;
3. after green build, user handles version bump manually;
4. avoid separate manual GitHub Action commits just to bump version;
5. prefer proper npm-based versioning over hand-editing `package.json` and `package-lock.json`.

## Changelog/news rule

- Include user-facing changes only.
- Do not include internal operational reminders about package files.
- Keep changelog useful and clear.
- Avoid mentioning hidden implementation details unless they matter to users/admins.

## Repo / branch facts previously mentioned

- Default branch: `main`.
- Repo: `q587p/chornolis-marches`.
- User has worked with GitHub permissions/actions including branch/file/PR operations.
