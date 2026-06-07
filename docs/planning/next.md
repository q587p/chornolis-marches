# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The active `0.16.x` lane is **NPC Mentorship / Guided Learning MVP**, built on
the completed `0.15.x` attention and learning foundation:

> dream -> waking edge -> location -> look/examine -> signs/traces/small finds -> stamina/rest -> day/night/light -> first safe return -> first learning by observation.

The last apiary slices are now treated as completed/in-testing content endpoints, not the center of the next sequence:

- `APIARY-001` / `APIARY-002`: `0.15.19` shipped the old log apiary and passive bumblebee hazard.
- `APIARY-003`: `0.15.20` shipped the first risky honey/beeswax harvest/raid slice.
- `APIARY-004`: bear honey behavior remains backlog/future.

The `LEARN-001` foundation is in testing after the minimal persistent learning/progress slice. Future observation and track-learning work should use `src/services/learning.ts` and `CharacterLearningProgress` instead of inventing separate storage. `0.15.22` stabilized the first attentive gathering bridge, and `0.15.23` adds a technical `0..5` level policy plus the first narrow herbs/berries/mushrooms gathering effect. This still is not a broad skill-sheet lane.

`OBS-PREP-001` has a representative look/examine audit pass in testing. Use its checklist for incremental cleanup, but do not keep expanding it before the first narrow observation moment.

`0.15.25` adds a tiny starter-adjacent waking-world cellar for map-making and verticality texture. Treat it as a completed content support slice, not a new map-expansion lane or follow-intent implementation.

`0.15.26` puts that cellar to work as a small observation bridge: a herbalist can occasionally stage through the cellar/watchtower, gather herbs/berries/mushrooms through existing actions and return to sort/rest. This is the first visible profession-route MVP, not a full profession system or follow-intent implementation.

`0.15.28` adds a rare herbalist demonstration of the cellar's hidden spoken passage. Treat it as another proof that world actions can teach attentive players, while leaving follow intent, auto-follow and route-learning storage for later slices.

`0.15.29` adds follow intent as a narrow attention marker: a player can choose one visible local being whose movement they are trying to keep in mind. This is not auto-follow, not a group system and not learning by itself; it is support infrastructure for the next observation/track-learning slice.

`0.15.30` turns that marker into the first route-memory MVP: followed visible ordinary movement can leave a personal direction hint and `/track` can prioritize the fresh trail. Darkness can still hide direction, and hidden water-word passages remain non-repeatable without independent learning/triggering.

`0.15.31` stabilizes that route-memory layer with cooldowns for repeated hints
and silent tracking-observation progress. Treat follow intent as useful
attention context now, but do not promote automatic follow movement until live
cadence and darkness/hidden-route behavior feel settled.

`0.15.32` adds the first explicit manual step from that memory: `Йти слідом`
(`/follow_step`) can submit an ordinary move only from fresh clear route memory.
This is not continuous following, not route replay and not group travel; it is a
small player-confirmed bridge between attention and movement.

`0.15.35` adds the first MAP-004 runtime proof: a tiny starter-adjacent
attention-gated waking-world pocket that needs light-aware `/examine` before it
offers a careful `Пролізти` (`/crawl`) action. Treat this as a small proof of
attention-gated access, not a broad skill-lock framework or loot location.

`0.15.37` adds the second MAP-004 proof with a different attention path:
fresh tracks or clear follow-route memory can reveal `Пройти за слідом`
(`/follow_trace`) through a tiny grass-run passage. Treat this as a track-aware
micro-place, not auto-follow, route replay or a loot/content loop.

`0.15.43` makes explicit `Сліди` (`/track`) practice canonical and adds the
first bounded track-reading quality effects. Treat this as output polish for
reading traces, not auto-follow, route replay, hidden-route repetition or a
public skill sheet.

`0.15.44` stabilizes the learning surfaces after the actor/attack/tracking run.
Ordinary `/me` and target inspection should stay short and qualitative, while
technical/scribe surfaces keep the raw rows. Action effects should use previous
stored experience by default; a completed action then records practice for the
next attempt.

`0.15.45` adds the first high-skill qualitative outcomes without opening a broad
loot or economy loop. Treat it as a small proof that skill can sometimes change
the feel of a successful action: gathering may rarely notice one extra ordinary
unit of the same supported resource, and freshening may rarely add cleaner-work
text without increasing meat yield.

`0.15.46` adds guarded follow assist as an opt-in ordinary-exit auto-attempt.
Treat it as a conservative bridge from route-memory to movement, not group
travel, route replay or hidden-passage repetition. Watch proactive message
cadence and blocking reasons in live play before widening it: successful assist
currently adds a personal assist message after the route-memory hint, and failed
assist attempts return internal reasons without player-facing nudges. If live
play feels noisy or confusing, add a small throttled follow-assist polish pass
instead of expanding group movement.

`0.15.47` adds the first consensual travel group foundation. Treat it as social
and travel context only: create/invite/accept/leave/disband and follow-leader
setup, with no automatic group movement, shared combat, loot, inventory or
hidden-route sharing.

`0.15.48` is a bugfix/performance cleanup after the learning and social run:
scribe/admin learning lookup can resolve named local characters as creature
actors, and `WorldEvent` gets first title/location/player/time indexes for the
many recent marker-backed systems. Treat this as infrastructure stabilization,
not new gameplay. If event marker lookups keep growing, move hot cooldown/dedupe
keys out of `description contains` and into structured storage.

`0.15.49` polishes the current group/follow layer instead of adding group
movement: follow-assist success copy is less duplicative, useful blocked-assist
reasons can be hinted with cooldowns, `/group` distinguishes nearby and
elsewhere members, and invite/status buttons route to existing explicit group
commands. Keep automatic group movement, shared combat/loot/inventory and party
chat deferred.

`0.15.50` adds guarded continuous follow-assist catch-up. Treat it as a
post-arrival continuation of per-player follow assist, not group movement: each
step is still an ordinary visible-exit `MOVE`, hidden/dark/stale route memory
does not move the player, and manual queued actions block catch-up.

`0.15.51` stabilizes continuous follow assist instead of widening it: queued or
running player actions block catch-up, AFK/ended/unavailable players stay out of
the loop, assist events carry small diagnostics, and `slow:followAssist.catchUp`
is documented for live smoke checks.

`0.16.0` starts NPC mentorship with offers after follow intent. Keep mentorship
separate from `TravelGroup`: mentorship is teacher/student attention and
learning context, while `TravelGroup` remains a player-player road group.
Acceptance stores context and sets follow intent, but does not grant learning,
enable follow assist, move the player or share hidden routes.

`0.16.1` adds the first active-mentorship observation bonus for supported
gathering. Treat it as proof that mentorship matters only through real attention:
the player must observe the active mentor doing relevant work. Tracking
mentorship, generic reply UX and broader teaching effects remain separate.
The `0.16.1` alias-first pending-answer fix should stay in place so slashless
commands are not swallowed as unclear mentorship answers. A remaining copy
follow-up is the gathering offer phrasing: it still assumes a feminine mentor in
the "її сліду" line, so make mentor offer text gender/form-aware before widening
gathering mentors beyond the current authored case.
Also watch the `amount=2` gathering observation bonus in live play. If following
one herbalist grows gathering too quickly, add a cooldown or separate
`mentorship_observation` context; if mentorship starts depending on more source
descriptions, prefer structured source markers over parsing `actorCreature=...`
strings.

`0.16.2` adds hunter/tracking mentorship and a small reply-button foundation.
Tracking mentorship now has its first observation path through fresh clear
ordinary movement by the active mentor, while `Відповісти` makes directed speech
easier to answer without becoming group chat. Keep both narrow: no learning on
accept, no hidden-route sharing, no attack teaching and no automatic group
movement.
Reply pending state remains an in-memory next-message helper after the
persisted remembered reply target; if restarts make players lose replies often,
add a soft "press reply again" path or restore the pending state narrowly.

`0.16.3` adds live-polish around that foundation: rare cooldowned mentorship
lesson feedback when a real mentored observation bonus happens, compact recent
lesson status in `/mentor`, and clearer timeout/cancel behavior for the
`Відповісти` button. Keep this as qualitative feedback, not a new learning
source or public skill surface.
Tracking mentorship lesson feedback should stay tied to the route-memory
learning trigger until a separate explicit hunter-teaches event is worth the
extra machinery.
Live-watch lesson frequency in places where players often use `/look` or
`/examine`: the 10-minute marker cooldown should keep copy sparse, but if
mentor-heavy rooms still feel chatty, make lesson feedback rarer or limit it to
the first lesson per mentor/context instead of adding more variants.

`0.16.4` adds the first guided practice prompt after a real mentored gathering
lesson. Treat it as "you watched, now try" rather than a quest system: optional,
cooldowned, no direct learning grant, and routed through the existing gather
action. Tracking prompts and mentor-specific route lessons remain future slices.

`0.16.5` moves the hottest short-lived cooldown/dedupe markers into structured
`WorldEventMarker` rows while keeping readable `WorldEvent` audit rows. Treat it
as infrastructure testing only: no new mentorship content, no group movement, no
combat effects and no public skill UI. Next candidates after this are mentor
guided tracking prompt, mentor route polish, and group movement design only if
live follow/group behavior stays stable.
Mentorship lesson/practice cooldowns are already structured marker rows; if
slow logs heat up again, tune indexed marker fields or retention rather than
returning to `WorldEvent.description` parsing. Route-memory remains
`WorldEvent`-backed for now, so repeated route-memory hotspots should become a
structured route-memory/marker follow-up rather than broader event scans.

`0.16.6` cleans up a narrow slice of resource/corpse text helpers. Treat it as
text/lexicon/grammar cleanup only: resource display names, accusative names and
current corpse names now share lexicon-backed helpers, while gameplay rules and
marker storage stay unchanged. Future text cleanup can take separate small
slices in `locations.ts`, `targets.ts` or `actionCompletions.ts` if a duplicated
map is fully covered by tests.

`0.16.7` cleans up a narrow slice of Ukrainian gender/agreement helpers and adds
an operator-only Herald archive republish queue. Treat the grammar part as
infrastructure only: player and creature gender fallback plus gendered word
selection are shared, while social signals, keyboards, help text, location prose
and action completions remain future focused slices. Treat the Herald part as
channel recovery tooling only: deployed `news.md` archive entries can be queued
oldest-first without using repost formatting or changing gameplay.

`0.16.8` extracts social signal labels and message templates into a content
module while keeping target resolution, notifications, reactions and event
logging in the service layer, and lets scribe-only unknown-command suggestions
see service commands without exposing them to ordinary players. Treat it as
content/suggestion organization only: no new signals, no keyboard/help changes
and no gameplay behavior changes.

Near-term mentorship/actor-learning should add a visible NPC learning loop:
one local character can occasionally learn by watching or following another
specialist, such as a herbalist or hunter, and drift through the world while
doing so. Once that learner reaches the teacher's rough level or passes it, the
loop should stop, the learner should eventually sleep or otherwise lose that
temporary gain, and the cycle should be able to begin again. Keep it narrow and
observable, so there is always a living example of attention-based learning
without turning it into a broad profession economy.

Future `Поклик духа` (`/spirit`) work should tie access or stronger behavior to
attention-based learning instead of leaving it as an always-immediate default:
after the player follows an appropriate teacher for long enough and sees enough
of their pattern, the spirit call can open or become more capable in that
teacher-specific direction. Keep it diegetic and narrow, not a public skill
level gate.

Do not open another broad content loop before the learning/observation foundation is used by real attention moments. Honey/wax uses, shops, barter, economy, theft, bear behavior, deep crafting and new profession loops should stay behind the attention-learning spine.

## Immediate Sequence

1. **0.15.38 / LEARN-002:** freshening learning and skill tuning is in testing: canonical freshening observation progress plus a small bounded success effect, with meat yield and combat deferred.
2. **0.15.39 / LEARN-003:** cooking observation/effect parity is done: canonical cooking observation progress plus a small bounded success effect, with recipes, food quality and economy deferred.
3. **0.15.40 / LEARN-004:** actor learning foundation is done: creature learning storage, conservative observed-actor defaults and qualitative/technical learning summaries.
4. **0.15.41 / LEARN-004 follow-up:** NPC observation learning MVP is done for the first narrow supported-gathering bridge; broader creature observation remains future work.
5. **0.15.42 / LEARN-005:** attack practice/observation canonical learning bridge is done as storage only, with no attack effects and no full combat expansion.
6. **0.15.43 / TRACK-LEARN-001-A:** tracking practice and track-reading quality is in testing: executed `/track` can teach, higher tracking can improve track output, and darkness still hides direction.
7. **0.15.44:** learning surface and planning cleanup is in testing: ordinary summaries stay short/diegetic, technical views stay raw, `/track` uses previous experience for current output, and clearly completed LEARN planning items are closed.
8. **0.15.45 / LEARN-006:** high-skill qualitative outcomes are in testing: rare gathering/freshening quality notes stay bounded, mostly textual and non-combat.
9. **FOLLOW-ASSIST-001 / 0.15.46:** guarded follow assist is in testing: opt-in, ordinary visible exits only, no hidden-route repeat, no group semantics.
10. **SOC-003 / 0.15.47:** travel group foundation is in testing: consensual membership and follow-leader setup only, no automatic group movement.
11. **0.15.48:** learning lookup and WorldEvent performance indexes are in testing: named creature learning lookup, first WorldEvent indexes and slow-path logs, with gameplay unchanged.
12. **0.15.49:** group/follow polish is in testing: clearer follow-assist messages, throttled blocker hints, grouped member presence and group action buttons, with group movement still deferred.
13. **0.15.50:** continuous follow-assist catch-up is in testing: per-player opt-in, post-arrival, ordinary visible exits only, with no group movement or hidden-route replay.
14. **0.15.51:** follow catch-up stability pass is in testing: manual/duplicate/session guardrails are documented and tested before widening the social layer.
15. **0.16.0 / NPC mentorship:** mentorship offer foundation is in testing: eligible local characters can offer teaching after follow intent, with accept/decline consent and no travel-group movement.
16. **0.16.1 / Mentorship observation:** gathering mentorship observation bonus is in testing: active mentorship can strengthen matching supported gathering observation, without learning on accept or global multipliers.
17. **0.16.2 / Tracking mentorship and reply UX:** tracking mentorship observation and the `Відповісти` button are in testing, with no group chat, attack teaching or hidden-route sharing.
18. **0.16.3 / Mentorship lesson feedback:** mentorship/reply polish is in testing: rare qualitative lesson lines, compact `/mentor` recent hints and clearer pending-reply timeout/cancel behavior, with no new skill effects.
19. **0.16.4 / Mentorship guided practice:** the first gathering practice prompt is in testing: optional, cooldowned and routed to existing gather action, with no direct skill grant or quest loop.
20. **0.16.5 / Structured WorldEvent markers:** marker storage refactor is in testing: follow-assist and mentorship cooldown/dedupe hot paths use `WorldEventMarker`, with `WorldEvent` audit rows preserved and gameplay unchanged.
21. **0.16.6 / Resource text lexicon cleanup:** resource/corpse text helpers are in testing, with duplicate display/grammar maps reduced and gameplay unchanged.
22. **0.16.7 / Grammar agreement helper cleanup and archive republish queue:** player/creature gender and word agreement helpers are in testing, with visible target/player text kept stable; Herald can queue a full deployed `news.md` archive republish run for channel rebuilds without changing gameplay.
23. **0.16.8 / Social signal content extraction and scribe suggestions:** social signal labels and message templates are in testing as content, with service behavior and visible strings kept stable; scribe-only unknown-command suggestions can see admin commands without changing command routing.
24. **NPC learner loop:** design a narrow NPC-watches-NPC learning loop where a local learner can follow or observe a specialist, stop once they catch up, then sleep/decay the temporary gain so the visible learning example can repeat.
25. **Spirit-call teacher unlock:** design a narrow `Поклик духа` (`/spirit`) unlock or capability gate that opens only after sustained following/attention around an appropriate teacher, not immediately at default character start.
26. **Mentor guided tracking prompt:** consider a narrow tracking practice prompt only after gathering prompts and marker cooldowns feel stable.
27. **Mentor route polish:** consider a tiny mentor-specific route/lesson only after guided prompts feel stable in live play.
28. **Group movement design:** if live group UX is clear, draft a separate consensual group movement slice with strict no-hidden-route/no-AFK-drag guardrails.
29. **Training/arena planning:** after full combat design, add a safe practice place where players can fight, watch fights and grow relevant skills without opening combat modifiers prematurely.
30. **MAP-004 follow-up:** after the light/examine and track/follow-memory proofs, decide whether the next gated place should use minimal gathering/herbalism/tracking progress and atmospheric below-threshold refusal copy.

Watch the new actor-learning surfaces before widening them: `0.15.41` proves
one NPC observation bridge, but freshening/cooking observation should remain a
focused follow-up; `observedActorSkillLevel(...)` defaults should move to a
small config map if they spread; and public target inspection should be trimmed
if `Навички:` starts feeling too much like a stat sheet in live play.

Near-term content candidates after that foundation:

- `MAP-005`: regional active curiosities for swamp, riverbank, forest and meadow, with small interactions and different consequences instead of only prose variation.
- `RET-001`: daily/weekly world tasks as optional return rhythm, not login streak punishment or a raw quest treadmill.
- `FISH-002`: riverbank fisher tiny slice.
- `RAVEN-001`: dream-raven presence near the carrion ravine.

## Deferred From Next

- `APIARY-004`: bear honey loop scaffold.
- Honey/wax food, remedy, offering, crafting, shop, barter and economy uses.
- Broader theft/hiding or social-risk systems before observation/visibility learning is stable.
- Full profession/economy loops before the first observation-learning spine exists.
- Broad `/skills` UI and skill modifiers/effects before bounded learning moments prove the foundation.
- `SURV-002`: authored death locations and lethal hazard pacing. Keep this as a survival/world-hazard framework task until death/knockout/respawn handling and clueing rules are ready; do not add unavoidable instant-death cells to beginner paths.

## Promotion Checklist

Before moving an item into `next`, ask:

1. Does it support Attention and Learning?
2. Can it be implemented and tested independently?
3. Does it preserve incomplete information and atmosphere?
4. Does it avoid becoming a new broad loop?
5. Does it have text/alias parity if player-facing?
