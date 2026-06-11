# Post-0.16 Lane Candidates

Candidate sequencing after the active `0.16.x` mentorship / NPC learning lane stabilizes.

This is not a replacement for `next.md`. Promote from here only when the active lane has landed or paused cleanly.

## Decision Fork

After `0.16.x`, choose the next lane from evidence instead of momentum:

- If production responsiveness remains questionable and no single narrow `0.16.x` bottleneck is obvious, start the `0.17.x` runtime heartbeat / scheduler lane from `docs/planning/runtime-heartbeats-and-0.17.md`.
- If responsiveness is acceptable or deliberately accepted, resume the practical content lane: bottles, herbalism and first prepared remedies.

Do not mix those two lanes in one PR. Runtime ownership changes should stay behavior-preserving first; content work should not smuggle in scheduler, recovery, queue or schema rewrites.

## Recommended Direction

1. **Runtime heartbeat lane if needed:** begin with a behavior-preserving scheduler skeleton, then player-first cadence, world tick phase split, due-based recovery/lifecycle audit and region/zone runtime state.
2. **First-session vertical smoke:** run a camp/dream/waking-world pass that checks the whole beginner promise after the 0.15-0.16 learning work.
3. **Guided tracking prompt:** add a narrow tracking-practice prompt only after gathering prompts and marker cooldowns feel stable.
4. **Mentor route polish:** add a tiny mentor-specific route/lesson if live mentorship needs stronger movement teaching.
5. **Spirit-call teacher unlock:** make `Поклик духа` (`/spirit`) depend on sustained attention around an appropriate teacher instead of being an always-immediate default.
6. **Bottles, herbalism and first prepared remedies:** make gathered herbs/berries/mushrooms useful through a narrow bottle-and-tincture lane, starting with `ALC-002`, `RECIPE-001`, `ALC-006` and revised `ALC-001`.
7. **Group movement design:** draft guardrails for consensual group movement only after follow/group behavior stays understandable.
8. **Training/arena planning:** after full combat design, plan a safe practice place where players can fight, watch fights and grow relevant skills without opening combat modifiers prematurely.
9. **MAP-004 follow-up:** choose the next attention-gated place after the light/examine and track/follow-memory proofs.

## Bottles, Herbalism And First Prepared Remedies

Recommended order:

1. `ALC-002`: root-pocket bottle cache and `empty_bottle` resource.
2. `RECIPE-001`: minimal resource recipe service foundation, now in testing as helper-only infrastructure.
3. `ALC-006`: herbalism skill and brewing failure policy, now in testing as outcome-policy infrastructure.
4. Revised `ALC-001`: first herbal stamina tincture using `empty_bottle`, herbs and berries, now in testing with bottle return after drinking and brewing failure policy.
5. `ALC-005`: rare herbalist mentorship hint toward brewing and the bottle niche, now in testing as a one-time qualitative mentor hint.
6. `ALC-004`: herbalist bottle route and visible brewing demonstration.
7. `RES-001`: wetland medicinal reagent, starting with `willow_bark`.
8. `ALC-003`: healing and night-sight draughts after stamina tincture, reagent and effect foundations are stable.

Guardrail: do not turn this into full alchemy, shops, barter, broad crafting trees or public skill UI. This lane exists to strengthen the current playable promise: attention, gathered resources, learning from local characters and small practical survival choices.

## Near-Term Content Candidates

- `MAP-005`: regional active curiosities for swamp, riverbank, forest and meadow, with small interactions and different consequences instead of only prose variation.
- `RET-001`: daily/weekly world tasks as optional return rhythm, not login-streak punishment or a raw quest treadmill.
- `FISH-002`: riverbank fisher tiny slice.
- `RAVEN-001`: dream-raven presence near the carrion ravine.

## Keep Deferred

- `APIARY-004`: bear honey loop scaffold.
- Honey/wax food, remedy, offering, crafting, shop, barter and economy uses.
- Broader theft/hiding or social-risk systems before observation/visibility learning is stable.
- Full profession/economy loops before the first observation-learning spine is stable.
- Broad `/skills` UI and skill modifiers/effects before bounded learning moments prove the foundation.
- Full alchemy trees, potion economy, water/thirst or dirty-bottle washing before the first bottle/tincture loop proves itself.
- `SURV-002`: authored death locations and lethal hazard pacing.
- Full Lisovyk learning/character rewrite, advanced spirit-call behavior, group movement and broad mentorship UI until their foundations are proven.
