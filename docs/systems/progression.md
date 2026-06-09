# Progression System

## Goals

Chornolis Marches should not use traditional character levels.

Progression should happen through use, observation and lived experience. A character becomes better at what they actually do, but can also learn by watching others.

After the first dream tutorial, the next progression priority is an observation-learning MVP rather than a broad stat tree. The first implementation can be narrow, scripted and local as long as it proves that attention to the world can teach.

## Persistent Learning Foundation

`0.15.21` adds the first shared persistence layer for learning:

- `CharacterLearningProgress` stores progress by player, skill key, source key and context key.
- `src/services/learning.ts` owns the small reusable helpers for recording progress, reading progress and detecting milestone transitions.
- Raw progress values stay technical-only; ordinary player text should remain qualitative and diegetic.
- The foundation is deliberately not a broad skill tree, not a public `/skills` UI and not a complete progression system.

The first canonical observation bridge is intentionally narrow: attentive presence around visible gathering of medicinal herbs, berries and mushrooms can record `gathering` progress with `observation` as the source and a resource-specific context. Honey, beeswax, twigs, money, loot-like finds and missing resource metadata do not create canonical gathering learning progress unless a later design task explicitly adds them.

`0.15.22` stabilizes this bridge by scanning a small set of recent gathering
source events and skipping sources the same player has already observed. This
keeps one already-seen or unsupported gather-like event from blocking a still
valid herbs/berries/mushrooms observation in the same short attention window.

`0.15.23` adds the first technical progression policy on top of that storage:

- learning levels are capped at `0..5`;
- level thresholds are `0`, `3`, `8`, `18`, `35` and `60` total progress;
- level labels stay technical (`unfamiliar`, `noticed`, `practiced`, `skilled`,
  `seasoned`, `masterful`) and are visible only through scribe/debug surfaces;
- `/learning [#id|name|username]` gives scribes a command-only snapshot of stored
  learning progress for one character.

The first bounded mechanical effect is deliberately narrow: gathering progress
for herbs, berries and mushrooms can slightly improve the matching gather
success chance and reduce stamina cost by at most a small capped amount. That
progress can now come from supported personal practice as well as observation:
ordinary player attempts on herbs, berries and mushrooms record `gathering` /
`practice` progress, including failed attempts that still spend time and
stamina. Tutorial dream foraging remains outside persistent practice progress so
the lesson cannot become a grind room. Honey, beeswax, twigs, money, loot-like
finds and unrelated gather-like actions do not receive this effect.

`0.15.26` adds the first visible profession route that feeds this observation
bridge: a herbalist can occasionally stage through the starter cellar and gather
herbs, berries or mushrooms through the same `GATHER_SPECIFIC` creature action
path. Nearby players still learn through the existing `/look`, `/examine` and
witnessed-action surfaces; there is no new `/observe`, public skill sheet or
separate herbalist-learning storage.

`0.15.28` adds a second tiny observation-shaped moment to the same profession
route: a herbalist in the cellar may rarely demonstrate a hidden spoken passage.
This teaches by being present for a local world action, not by adding a public
skill UI or a new observation command. Future track/follow learning can reuse
this pattern: a witnessed unusual movement may become a source for attention,
tracking or route-memory progress once those slices exist.

`0.15.29` adds the first follow-intent foundation. A player can mark one visible
local player, creature or local character as the being whose movement they are
trying to keep in mind. This is attention context only: it does not move the
follower, create a group, grant learning progress, or guarantee future tracking.
Future observation and track-learning slices can query that intent when deciding
whether a witnessed route, track or profession action was watched closely enough
to matter.

`0.15.30` adds the first follow-aware route-memory use of that marker. When a
followed visible local being moves through an ordinary visible exit, a co-located
follower may receive a short direction hint and `/track` can prioritize that
fresh trail. Clear witnessed followed movement also records a tiny silent
`tracking` / `observation` / `followed_movement` learning row. There is still no
public skill UI, no broad tracking modifier and no automatic movement.

`0.15.31` adds anti-grind cadence to that bridge. The route-memory hint and the
silent followed-movement learning row now use narrow `WorldEvent` cooldown
markers, so repeating the same movement context cannot rapidly farm tracking
progress or keep nudging the same follower. This does not change skill effects
or expose new public progress UI.

`0.15.32` lets clear route memory guide one explicit manual step through
`Йти слідом` (`/follow_step`). This does not add new learning progress by
itself: the previous witnessed movement remains the learning source. The manual
step simply asks the existing movement rules to use a fresh remembered ordinary
direction.

Follow movement remains intentionally limited. The current slice is one manual
action, not a continuous mode. It still respects darkness, stamina, queues,
visible exits and learned route knowledge. Hidden passages such as the cellar
water-word route must not be repeated merely because the followed actor used
them.

If a route memory was recorded in darkness, lighting a torch later does not
turn that old memory into a clear direction. The player should use `/track`,
fresh observation or another witnessed movement to recover the trail.

`0.15.35` adds the first attention-gated location proof for MAP-004. The root
gap under the starter cellar is not a skill-level lock yet: it uses the existing
light/feature-detail visibility rules so `/examine` can reveal a careful
`Пролізти` (`/crawl`) action only when the player can actually make out the
opening. This proves the access pattern without exposing a public skill sheet,
adding a loot room or introducing a broad gated-exit framework.

`0.15.37` adds a second MAP-004 proof through track attention rather than
another light-only gate. A small low grass-run can reveal `Пройти за слідом`
(`/follow_trace`) when the player has fresh visible tracks in the location or a
recent clear follow-route memory there. Hidden water-word route memory does not
count, and this still does not add auto-follow, route replay or a public skill
modifier.

`0.15.38` makes freshening the next bounded skill-effect slice after gathering.
Personal freshening practice already used canonical progress; observing a recent
freshening source now writes canonical `freshening` / `observation` /
`freshening` progress too. Stored freshening progress can slightly improve the
ordinary player freshening success chance, with a small cap so failure remains
possible. Meat yield, corpse lifetime, attack effects and public `/skills` UI
remain deferred.

`0.15.39` gives cooking the same bounded food-learning shape. Personal cooking
practice remains canonical, and observing a recent cooking source now writes
canonical `cooking` / `observation` / `cooking` progress. Stored cooking
progress can slightly improve the ordinary player cooking success chance, while
raw meat cost, cooked meat yield, hunger relief, recipes, food quality, stations,
economy hooks and public `/skills` UI remain deferred.

`0.15.40` adds the first actor-learning foundation beyond players. Creature and
local-character learning uses a separate `CreatureLearningProgress` table so the
existing player learning rows stay stable. The first bridge is intentionally
non-combat: when a creature performs supported gathering practice on herbs,
berries or mushrooms, it can now leave canonical creature learning progress.
Ordinary player-facing surfaces show only compact qualitative skill summaries;
technical details and scribe/admin learning views can show raw rows. Attack,
combat effects, broad NPC observation and a public skill sheet remain deferred.

`observedActorSkillLevel(...)` now exists as a conservative foundation helper:
player targets use stored learning rows, while creature targets can combine
stored creature rows with small profession/species defaults. Those defaults are
profile estimates, not exact public numbers.

`0.15.41` adds the first narrow NPC/creature observation-learning path. When an
eligible local character completes an ordinary `LOOK`, the world can scan recent
supported gathering source events in the same location and record canonical
creature `gathering` / `observation` progress for herbs, berries or mushrooms.
This is intentionally profession-gated and non-combat: herbalists and hunters
can learn from this narrow nearby work, while ordinary animals do not become
broad gatherers, cooks or fresheners. Dedupe uses explicit `WorldEvent` markers
so one creature/source event does not grant repeated progress.

`0.15.42` moves the old attack-learning bridge onto canonical storage. Eligible
player and creature attack attempts can now write `attack` / `practice` /
`attack` rows, and witnessed attack sources can write `attack` / `observation` /
`attack` rows through the existing observation surfaces. Hunter-like local
characters can also learn from attack observation through their existing `LOOK`
completion path. This is storage only: hit chance, damage, weapons, predator AI,
PvP boundaries and combat pacing do not change.

`0.15.43` makes `/track` itself a canonical tracking practice path. Executed
track searches can now write `tracking` / `practice` / `track_search` progress,
and detailed track inspection writes `tracking` / `practice` / `track_detail`.
Successfully using the small track-gated grass-run passage can also record a
tiny `tracking` / `practice` / `track_gate` row. Stored tracking progress now
has the first bounded output-quality effects: rough age labels in brief track
results, a small capped result-count increase and a higher-skill darkness hint
that says track signs exist without revealing direction or identity. This still
does not add auto-follow, route replay, hidden water-word repetition, tracking
through darkness or a public `/skills` sheet.

`0.15.44` stabilizes the visible learning surfaces after the first actor and
tracking run. Ordinary `/me` text stays compact and qualitative: it shows only a
few top skill names with Ukrainian level labels, never `skillKey`, `sourceKey`,
`contextKey`, ids or raw totals. Target inspection is stricter so visible local
characters do not become public stat sheets: ordinary text shows only stored
learning rows that have become meaningful enough to notice, while profile
defaults remain technical context. Technical details and scribe/admin learning
views still show raw rows, including actor type/id, skill/source/context keys,
level, progress, total progress, milestone count, last source event and update
time.

`0.15.48` tightens that scribe/admin lookup surface: `/learning creature #id`,
`/learning creature <name>` and `/learning істота <name>` can resolve named
local characters as creature actors. Plain `/learning <name>` still prefers a
player match first, then falls back to a creature/local-character match if no
player is found. Creature output keeps stored learning rows separate from
profile defaults, because profile defaults are profession/species estimates and
not persistent progress.

Learning effects should normally use experience from before the current action.
The current action can still record practice after it is executed, but its newly
written progress should shape the next attempt unless a future slice explicitly
documents a same-action exception. `/track` follows that policy: track-reading
quality is computed first, then the paid search records practice for future
reads.

The same release also closes the clearly completed LEARN planning items whose
MVP acceptance is covered by merged releases: the `0.15.21` learning foundation,
`0.15.39` cooking parity, `0.15.40`/`0.15.41` actor/NPC observation foundation
and `0.15.42` attack canonical storage bridge. Broader skill-system ambitions
remain separate future work rather than part of those closed MVP items.

`0.15.45` adds the first high-skill qualitative outcomes. These are rare,
bounded action details rather than a new loot table or public skill sheet:
supported high-skill gathering can occasionally notice one extra ordinary unit
of the same herbs, berries or mushrooms already being gathered, and high-skill
freshening can occasionally add a cleaner-work note without changing meat yield.
The current action uses previously stored learning for this chance; the practice
recorded by that action only affects future attempts. Combat effects, broad rare
finds, economy hooks and public raw skill UI remain deferred.

`0.15.46` adds guarded follow assist on top of the existing attention and
route-memory spine. It is not a new learning effect: if a player explicitly
enables `Слідова підмога` (`/follow_assist_on`, compatible with
`/follow_assist on`) for the current follow intent, clear ordinary visible
movement by the followed target may submit one normal
`MOVE` for the follower. Hidden routes, darkness, missing exits, stamina,
posture, sleep, death and existing queued work still block it, and the cellar
water-word passage is not repeated automatically.

`0.16.0` starts the mentorship line. When a player deliberately follows a
suitable local character, that character may offer teaching if their observed
skill is meaningfully ahead of the player's. The first mentor roles are narrow:
herbalist-like locals can offer `gathering`, and hunter-like locals can offer
`tracking`. Accepting stores active mentorship context and sets follow intent to
the mentor, but does not grant learning progress, multiply observation, enable
follow assist, create a travel group or share hidden routes. Future observation
bonuses can use this stored context in a separate slice.

`0.16.1` makes active mentorship matter through actual observation. When a
player with active `gathering` mentorship observes that same mentor gathering a
supported resource (`herbs`, `berries` or `mushrooms`), the usual canonical
`gathering` / `observation` / `resource:*` progress can be a little stronger.
This is still not passive learning: accepting mentorship alone grants nothing,
unrelated gatherers do not count, unsupported resources do not count and hunter
tracking mentorship remains a separate follow-up.

Current mentor matching for this gathering bridge depends on the observed source
description carrying `actorCreature=<id>`. That is acceptable for the current
source-description format, but if source descriptions change or more mentored
observation families join the system, move mentor/source identity into
structured source markers instead of relying on string parsing. Also watch live
gathering growth from the first `amount=2` mentored observation bonus: if a
player can follow one herbalist for too much progress too quickly, add a
cooldown or separate `mentorship_observation` context before widening it.

`0.16.2` adds the first hunter/tracking mentorship observation bonus. When a
player has active `tracking` mentorship with a hunter-like local character and
receives fresh clear follow-route memory from that mentor's ordinary visible
movement, the player can also record canonical `tracking` / `observation` /
`mentorship_followed_movement` progress. Hidden routes, dark/non-directional
memory, stale movement, non-mentor movement and offered/declined mentorship do
not count. This still does not grant learning on accept and does not add attack
teaching, route replay or hidden-route sharing.

`0.16.3` lets mentored learning occasionally speak back in a diegetic way. When
the active mentorship bonus actually applies to gathering or tracking
observation, the player may receive a short qualitative lesson line, guarded by
a cooldowned marker. `/mentor` can also show one compact recent-lesson hint.
These lines never expose raw progress, XP, levels, amounts or chances, and they
do not create progress by themselves.

The default lesson-feedback cooldown is 10 minutes per player/mentor/context.
Watch live rooms where players frequently use `/look` or `/examine`: if active
mentors generate enough gathering or tracking observations that lesson copy
feels noisy, make feedback rarer or limit it to the first lesson per
mentor/context before adding more lesson text.

`0.16.4` adds the first guided practice prompt after a real mentored lesson. The
initial prompt is gathering-only: after a cooldowned gathering lesson, if the
same supported resource is still available nearby, the mentor can invite the
player to try the existing gather action. The prompt is optional, does not grant
learning by itself and does not change success, stamina, rewards or practice
rules. Tracking prompts remain a separate follow-up.

The first prompt appears only when lesson feedback itself is not on cooldown and
a new lesson marker is created. That keeps mentor chat quiet, but it means live
players may sometimes see a mentor demonstrate work without getting the optional
"you try" prompt. If that feels too sparse, split lesson feedback cadence from
practice-prompt cadence instead of making every observed mentor action speak.

`0.16.5` is a technical marker-storage refactor for the same learning and follow
spine. `WorldEvent` still carries readable lesson, prompt and follow-assist
audit rows, while short-lived cooldown/dedupe checks for follow-assist failure
hints, follow-assist queued moves, mentorship lesson feedback and mentorship
practice prompts now use structured `WorldEventMarker` rows. This does not add
new mentorship content, skill effects, public skill UI or gameplay rules.

`0.16.15` adds the first `herbalism` / `знахарство` brewing outcome policy for
future prepared remedies. Herbalism is separate from `gathering` and `cooking`:
gathering finds herbs and berries, cooking prepares ordinary food, while
herbalism governs careful tincture/draught preparation. The first policy stays
hidden and qualitative: ordinary players should not see raw success chances,
levels or thresholds. Success, ordinary failure and harsher bottle-breaking
failure are described by helper policy.

`0.16.16` wires that policy into the first live prepared remedy. Brewing a
`herbal_tincture` uses the recipe helper for input validation and the herbalism
policy for the outcome. Missing ingredients consume nothing and record no
practice. Real attempts record `herbalism` / `practice` /
`brew:herbal_tincture` after the outcome, so success and meaningful failures
teach the next attempt without showing raw numbers to ordinary players.

After the actor-learning foundation, the intended near-term order is:

- `0.15.46`: guarded follow assist is in testing as an opt-in ordinary-exit
  auto-attempt. It should be watched for chat cadence and conservative blocking
  before promoting any group/travel layer.
- Later high-skill slices may add occasional qualitative outcomes, such as a
  fine cut of meat, a special medicinal herb or a tiny incidental `шаг` find,
  but those belong behind bounded rare-result rules rather than the first
  chance/cost effects.

The first NPC-to-NPC learner proof is deliberately narrower than full observed
actor skill. A `profession_learner` marker on one local NPC lets that NPC seek a
matching specialist profile, currently herbalist or hunter, then either stay
nearby, follow the specialist's trail, or quietly watch the specialist work.
Progress is stored only as bounded technical marker state in the learner's
`currentAction`, stops once the learner roughly catches up to the profile's
supported level, and decays after a short rest so the behavior can repeat later.
It does not grant player rewards, expose a public skill UI, add a profession
economy, unlock `/spirit` teachers, create mentorship UI, change group movement,
or alter WorldEvent/WorldEventMarker schema.

Spirit-call teacher unlocks and a Лісовик learning pass remain future slices.

Future observation, tracking, apprenticeship and practice slices should use this service instead of inventing separate progress storage.

## 0.13.11+ Learning Placeholders and Bridges

`0.13.11` adds a deliberately small attack-learning bridge before real skill rows exist:

- every thirteenth successful player animal kill through `ATTACK` sends only that player `Навичка <b>атаки</b> підросла.`;
- when a player uses `look` or `examine` soon after someone else kills prey in the same location, that observation is recorded once for that kill;
- every fifth such recorded observation sends only that observer `Навичка <b>атаки</b> трохи підросла.`;
- these messages are still mostly legacy text/`WorldEvent` cadence and should be moved onto the shared learning service in a focused follow-up.

`0.13.12` extends the same text-only bridge to gathering:

- every thirteenth player gather attempt through `GATHER` or `GATHER_SPECIFIC` sends only that player `Навичка <b>збирання</b> підросла.`;
- failed gather attempts count for practice, because the character still spends time and stamina learning what does not work;
- every completed player or NPC gather attempt records a short hidden observation source;
- inspecting another character/NPC, using `examine` for the location, or using the brief `look` while the location has active light can record one observation of that recent gather source;
- every fifth such recorded observation sends only that observer `Навичка <b>збирання</b> трохи підросла.`;
- as of `0.15.21`, the observation side also writes canonical `CharacterLearningProgress` rows only for herbs, berries and mushrooms, while the visible milestone cadence remains intentionally sparse.
- as of `0.15.23`, ordinary player practice also writes canonical `CharacterLearningProgress` rows for herbs, berries and mushrooms, while tutorial foraging and unsupported gather-like sources stay outside that persistent path.

## Near-Term Skill Effects

The next learning layers should continue making skill growth matter mechanically. A message such as `Навичка <b>атаки</b> підросла.` should not remain purely decorative once persistent skill storage exists.

`0.15.23` implements the first bounded effect only for herbs, berries and
mushrooms. Preferred future effects remain bounded and action-specific:

- better success chance for practiced actions;
- slightly lower stamina cost for familiar repeated work, with a hard floor so actions never become free;
- better yield or quality where the action already has variable output;
- softer failure consequences where the design allows it.

Early candidates are attack/hunting, freshening/butchering, gathering/herbalism, cooking and attentive inspection/observation. Ordinary player-facing text should stay qualitative; exact modifiers belong only in technical or scribe/admin views.

## Principles

- No universal character level.
- Skills improve through relevant actions.
- Skills can be discovered by observing someone who uses them.
- A character may learn the basic idea of a skill before being able to use it.
- Observation can improve a skill if the observed being has a higher skill level.
- Learning from observation is not guaranteed.
- Relevant attributes affect learning chance.
- Current skill affects learning chance.
- More difficult, dangerous or meaningful situations teach more than safe repetition.
- Failures can also teach, especially when the action was plausible.
- NPCs, animals, monsters and mythical beings may use the same attribute/skill model.

## Example Skills

- Gathering
- Tracking
- Hunting
- Fishing
- Herbalism
- Crafting
- Combat
- Ritual Lore

## Learning a New Skill

A character may gain access to a new skill by observing someone use it.

Examples:

- Watching a herbalist gather herbs may unlock basic Herbalism.
- Watching a hunter set a snare may unlock Trapping.
- Watching a fisher use a line or net may unlock Fishing.
- Watching a wolf follow tracks may unlock or improve Tracking.
- Watching a fox vanish into undergrowth may improve Stealth.
- Watching a fox or other hunter strike prey during a clear tutorial moment may improve Attack.
- Watching a mythical being cross a boundary may unlock strange or rare skills.

The first learned level should represent understanding the idea of the skill, not mastery.

## Improving by Observation

A character may improve a known skill by observing another being use it, if that being has a higher skill level.

Observation should consider:

- observer’s relevant attribute;
- observer’s current skill;
- observed being’s skill;
- clarity of the observed action;
- danger and pressure of the situation;
- distance and visibility;
- whether the observer is actively watching;
- whether the action is natural, trained, magical or mythical.

## Example Learning Logic

Observation is more likely to teach when:

- the observed being is clearly more skilled;
- the observer has enough perception/instinct/intelligence-like attribute;
- the observer already has related experience;
- the action happens slowly or clearly;
- the observer is focused on the action.

Observation is less likely to teach when:

- the observer is distracted;
- it is dark or visibility is poor;
- the action is too fast;
- the skill gap is too large to understand;
- the action is supernatural or species-specific;
- the observer lacks the needed foundation.

## Skill Discovery Examples

| Observed action | Possible skill learned |
|---|---|
| Herbalist gathers herbs | Herbalism / Gathering |
| Hunter sets a trap | Trapping |
| Wolf follows tracks | Tracking |
| Fox hides in brush | Stealth |
| Fisher catches fish | Fishing |
| Blacksmith repairs a blade | Smithing |
| Volkhv performs a ritual | Ritual Lore |
| Forest spirit moves through fog | Liminal Movement / Mythic Lore |

## Example Messages

```text
Травник нахиляється біля коріння старої верби, розтирає листок між пальцями й обережно зрізає стебло.

Ви уважно спостерігаєте.
Здається, тепер ви трохи краще розумієте, як шукати лікувальні трави.
Навичка відкрита: Травництво.
```

```text
Вовк довго нюхає мокру землю, обходить кущі й раптом звертає на ледь помітний слід.

Ви помічаєте закономірність у його русі.
Слідування трохи покращено.
```

```text
Щось кидається на здобич. За мить миша падає нерухомо.

Ви помічаєте, як короткий ривок вирішує більше, ніж довге переслідування.
Атака трохи покращена.
```

```text
Лісовик не йде стежкою — він ніби знаходить межу між деревами й тінню.

Ви не певні, що зрозуміли це.
Але щось у вашому сприйнятті лісу змінилося.
```

## Design Notes

Learning should feel like apprenticeship, imitation and attention to the world.

Do not start by exposing a large skill sheet. Let early learning appear through concrete moments: a trace noticed, a gathering pattern understood, a gesture copied, a route remembered, or an NPC action watched carefully.

A player should sometimes think:

> “I watched how they did it. Maybe I can try.”

This makes NPCs, animals and spirits into sources of knowledge, not just enemies, vendors or scenery.
