---
id: ONB-001-G
title: Tutorial fire, torch and hmyz branch
status: next
type: feature
area: onboarding
priority: high
estimate: 3-5h
tags:
  - tutorial
  - fire
  - torch
  - hmyz
  - campfire
depends_on:
  - HMYZ-001-D
  - WORLD-002
---

# ONB-001-G: Tutorial Fire, Torch and Hmyz Branch

## Goal

Teach the first fire loop inside the tutorial dream without turning it into a raw checklist:

1. notice a living fire;
2. receive or take a torch;
3. light the torch from a fire source;
4. relight an extinguished campfire;
5. see that fire can fade;
6. add hmyz to extend or prepare a campfire.

This should make `факел`, `вогнище` and `хмиз` feel like parts of one survival rhythm before the player meets the harsher real-world version.

## First Scope

- Add a short tutorial branch after the existing safe/rest fire area.
- Introduce a fire-guide voice distinct from Сон and Дрімота if it fits the scene: a small fire-keeper, ember-voice, dream spark, boundary hearth-presence or similar.
- At a bright tutorial campfire, let the guide offer a torch after the player examines the campfire or enters the scene with enough stamina.
- If the player is tired, the guide should point them toward resting first, then teach the torch.
- Explain diegetically that a torch can be lit from a campfire or another lit torch.
- Add a following room with one or more extinguished campfires, preferably enough that simultaneous tutorial players do not block each other.
- Prompt the player to light the extinguished campfire with the lit torch.
- After relighting, show a short Сон / Дрімота / fire-guide response that fire changes what can be seen.
- Make the tutorial campfire fade quickly enough that the player can see the need for hmyz.
- Provide hmyz in the tutorial branch by either:
  - giving a small amount on scene entry;
  - making it fall from a dream-torch after the relight lesson;
  - placing it visibly under `Лежить`;
  - or a mix of the above.
- Make the dream explicitly say that tutorial torches and fires behave faster than waking-world torches and fires.
- Ensure all three `Додати хмиз` entry points keep working in the tutorial path:
  - location feature button;
  - inventory item action;
  - text alias.
- After successful hmyz use, show the existing or shared `🔥 Підпалити` follow-up when the target campfire is extinguished and the player has a lit torch.

## Future Idea

Later, allow a character to light their torch from another character's lit torch with consent or a clear social agreement. This should not be a silent steal of another player's fire. A possible flow:

- ask the torch-holder;
- holder accepts;
- requester gets a `Підпалити факел` action from that shared flame;
- nearby text makes the exchange visible but not spammy.

This likely belongs with broader social consent / shared action work, not the first tutorial fire branch.

## Acceptance

- A tutorial player can learn torch lighting from a fire source.
- A tutorial player can relight an extinguished campfire with a lit torch.
- A tutorial player can learn why hmyz matters after a fire fades.
- Hmyz can be picked up or received, appears in `Речі`, and can be used from the location feature, inventory action or text alias.
- The tutorial text says the dream version is faster/easier than waking-world fire.
- The branch remains skippable and does not block `/wake` or `/tutorialEnd`.
- The guide voice feels like Порубіжжя, not a system popup.

## Risks

- Tutorial fire can become too long if it tries to teach every fire rule at once.
- Fast tutorial timers should not leak into real-world fire balance.
- Multiple players in the same tutorial branch need safe handling for shared extinguished campfires and hmyz supplies.

## Implementation Order

Do after: `HMYZ-001-D`, the shared fire/hmyz UI follow-up helper, and the current tutorial completion controls.
