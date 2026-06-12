# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The active `0.16.x` lane is in **readiness, mentorship closure and planning closeout**.

Do not replace or derail it with a broad scheduler rewrite, combat system, economy, theft, crafting, group movement or deep spirit systems. The current lane should finish proving one vertical promise:

> dream -> waking edge -> location -> look/examine -> signs/traces/small finds -> stamina/rest -> day/night/light -> first safe return -> first learning by observation -> guided practice with living teachers.

`0.16.x` may still take narrow bugfixes, text polish, first-session smoke, evidence collection and docs-only planning. The central runtime heartbeat / scheduler lane belongs to `0.17.x`; see `docs/planning/runtime-heartbeats-and-0.17.md`.

## Immediate Candidates

Keep the next patches narrow and reviewable. The next decision is a live-watch gate, not automatic promotion of another feature:

1. Live-watch review after `0.16.37` - use `docs/ops/0.16-mentorship-learning-live-watch.md` to decide whether the late-`0.16` learning spine is quiet and readable enough to leave alone.
2. Mentor route polish - one tiny mentor-specific route/copy lesson only if live-watch shows a concrete unclear prompt or route moment.
3. `STAT-003` / Deferred heavy diagnostics replies - consider only if `/stat`, `/stat_species`, `/world`, `/all` or `/queueDebug` keep blocking ordinary play under evidence.
4. Post-`0.16` content lane - resume bottles, herbalism and first prepared remedies if responsiveness and learning prompts look acceptable.
5. `0.17` runtime heartbeat skeleton - start only if telemetry/world tick evidence demands scheduler ownership work.

The post-`0.16.28` performance evidence report is complete with outcome `no-code`: telemetry did not justify runtime tuning in this lane. Keep collecting guarded snapshots if responsiveness worsens, but do not start queue/recovery/Telegram/Prisma tuning without a new narrow evidence category.

`TRACK-LEARN-001-D` is now testing/live-watch, not the first immediate candidate. Keep full `TRACK-LEARN-001` as future-only unless live follow-assist, tracking prompt noise and blocker copy stay stable in real play.

## Post-0.16 Candidate Lane

After the current mentorship/NPC-learning lane stabilizes, choose deliberately between:

- `0.17.x` runtime heartbeats if production responsiveness remains questionable or telemetry does not point to one narrow `0.16.x` fix;
- bottles, herbalism and first prepared remedies if runtime pressure is acceptable or consciously accepted.

The practical content lane remains `ALC-002` bottle source, `RECIPE-001` minimal recipe helper, `ALC-006` herbalism/failure policy, revised `ALC-001` stamina tincture, then herbalist hints/demonstrations and wetland reagents. Keep it humble: no full alchemy tree, broad crafting UI, shops, barter or public skill sheet.

## Boundaries

- `0.16.x` may document runtime architecture and collect guarded evidence; it should not hide a central heartbeat/scheduler rewrite inside a small release.
- Full `Слідування` stays blocked until the existing follow-assist and mentorship prompt behavior has been watched live and stays understandable without spam.
- Attack practice and observation already exist as a minimal bridge. Do not turn remaining `0.16.x` work into training arenas, sparring, PvP, armor/round/wound rules, broad weapon modifiers or a public skill sheet.
- Keep mentorship separate from `TravelGroup`: mentorship is teacher/student attention and learning context; travel groups remain player-player road groups.
- Do not add public skill sheets or broad modifiers before bounded learning moments stay readable in play.
- Do not open another broad content loop before the attention-learning spine is used by real attention moments.
- Spirit-call teacher unlock, full Lisovyk character pass, group movement automation and full combat remain future-only unless explicitly promoted into a narrow PR.
- Honey/wax uses, shops, barter, economy, theft, bear behavior, deep crafting and new profession loops stay behind the active learning/observation spine.

## References

- Current cautions: `docs/planning/watchpoints.md`
- Runtime heartbeat lane: `docs/planning/runtime-heartbeats-and-0.17.md`
- Attack-learning boundary: `docs/planning/attack-learning-0.16-review.md`
- Post-0.16 candidate lane: `docs/planning/post_0_16_lane.md`
- 0.15 learning/follow history: `docs/planning/history/0.15-learning-follow-history.md`
- 0.16 mentorship history: `docs/planning/history/0.16-mentorship-history.md`
- Full pre-reset `next.md` archive: `docs/planning/history/next-pre-reset-2026-06-08.md`

## Promotion Checklist

Before moving an item into `next`, ask:

1. Does it support Attention and Learning?
2. Can it be implemented and tested independently?
3. Does it preserve incomplete information and atmosphere?
4. Does it avoid becoming a new broad loop?
5. Does it have text/alias parity if player-facing?
6. If it adds player-facing functionality, does `Навчання` need at least a text hint even when a full lesson is out of scope?
