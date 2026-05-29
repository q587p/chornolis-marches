# Progression System

## Goals

Chornolis Marches should not use traditional character levels.

Progression should happen through use, observation and lived experience. A character becomes better at what they actually do, but can also learn by watching others.

The first implementation should be narrow, local and concrete. It is better to prove one good observation moment than to expose a large empty skill sheet.

## Principles

- No universal character level.
- Skills improve through relevant actions.
- Skills can be discovered by observing someone who uses them.
- A character may learn the basic idea of a skill before being able to use it.
- Observation can improve a known skill if the observed being is meaningfully more skilled.
- Learning from observation is not guaranteed.
- Relevant attributes affect learning chance.
- Current skill affects learning chance.
- More difficult, dangerous or meaningful situations teach more than safe repetition.
- Failures can also teach, especially when the action was plausible.
- NPCs, animals, monsters and mythical beings may eventually use the same attribute/skill model.

## Near-Term MVP

The first MVP should cover only two or three cases:

1. Watching a herbalist or gathering action teaches a small `herbalism` / `gathering` hint.
2. Examining fresh tracks or watching an animal follow movement teaches a small `tracking` hint.
3. A tutorial or dream moment explains that careful attention can teach, without exposing raw systems.

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

Observation should consider:

- observer's relevant attribute;
- observer's current skill;
- observed being's skill;
- clarity of the observed action;
- danger and pressure of the situation;
- distance and visibility;
- whether the observer is actively watching;
- whether the action is natural, trained, magical or mythical.

Observation is more likely to teach when:

- the observed being is clearly more skilled;
- the observer already has related experience;
- the action happens slowly or clearly;
- the observer is focused;
- there is enough light and distance is reasonable.

Observation is less likely to teach when:

- the observer is distracted;
- it is dark or visibility is poor;
- the action is too fast;
- the skill gap is too large to understand;
- the action is supernatural or species-specific;
- the observer lacks the needed foundation.

## Use-Based Progression

Use-based progression should come through actual actions in the world:

- gathering herbs;
- following tracks;
- setting traps;
- fishing;
- fighting;
- crafting;
- treating wounds;
- moving through difficult or dangerous terrain.

Repeated use can teach, but grinding should have diminishing returns. Dangerous, meaningful or scarce actions should teach more than safe repetition.

## Example Messages

```text
Травник нахиляється біля коріння старої верби, розтирає листок між пальцями й обережно зрізає стебло.

Ви уважно спостерігаєте.
Здається, тепер ви трохи краще розумієте, як шукати лікувальні трави.
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

## UI Rules

- Do not start with a broad public skill sheet.
- Ordinary player text should be diegetic: “ви краще розумієте...”, not raw progress numbers.
- Raw values may appear only in scribe/admin technical detail mode.
- Early learning should be local, concrete and memorable.

## Data Notes

A minimal future storage model may be enough:

```prisma
model CharacterSkill {
  id           Int      @id @default(autoincrement())
  playerId     Int
  key          String
  level        Int      @default(0)
  progress     Int      @default(0)
  discoveredAt DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([playerId, key])
}
```

Do not add this until the observation MVP actually needs persistent progress.
