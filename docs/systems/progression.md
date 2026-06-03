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

## Near-Term Skill Effects

The next learning layer should make skill growth matter mechanically. A message such as `Навичка <b>атаки</b> підросла.` should not remain purely decorative once persistent skill storage exists.

Preferred first effects are bounded and action-specific:

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
