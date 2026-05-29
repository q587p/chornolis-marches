# Prompt — Socialization / Contacts / Groups Pack

Paste or adapt this when implementing the first socialization layer:

```text
We are working in the `q587p/chornolis-marches` repository.

Before editing, read:
- AGENTS.md
- docs/codex/00-codex-start-here.md
- docs/codex/05-workflow-and-versioning.md
- docs/codex/04-terminology-and-language.md
- docs/systems/social_graph_and_groups.md

Implement the socialization layer in small, reviewable steps. Repository docs are the source of truth.

Desired order:
1. Implement `SOC-001` contacts/acquaintances first.
2. Then `SOC-002` follow intent.
3. Then `SOC-003` travel group core.
4. Then `SOC-004` group movement.
5. Polish UI/copy with `SOC-007`.
6. Keep `SOC-006` NPC compatibility in service design from the start, but do not expose full NPC recruitment yet.
7. Keep `SOC-005` group combat conservative; do not multiply current instant-kill attack logic.

Core design:
- Player-facing group term: `Гурт`.
- Player-facing contact/acquaintance term: prefer `Знайомства` for diegetic UI.
- Following is weaker than group membership: a follower can follow a visible target; the leader can accept them into a group.
- Automatic movement starts only after accepted group membership.
- If a group member lacks `Снага`, `Життя`, location access or action capacity, the leader continues and the member becomes lagging/left behind.
- Members can leave. Leaders can exclude members.
- Do not reveal player-vs-NPC technical type in normal UI.
- Services should support both `PLAYER` and `CREATURE` actor keys, even if initial UI is player-led.

Expected deliverable per step:
- say which files changed;
- include migration name if schema changed;
- summarize behavior;
- run `npm run build` and `npm test` where possible.
```
