# NPC Professions and Player-like NPCs

NPCs should feel close to player characters, not like obvious game objects.

Long-term, NPCs should converge with players where the rule is genuinely shared: inventory, held items, active light, stamina/action pacing, hunger, wounds, skills, social state and movement should use common actor-facing services whenever practical. Profession code should decide what the NPC tries to do; shared actor code should handle ordinary mechanics such as carrying a torch, burning its timer down, making light, spending stamina, holding resources, cooking or eating.

Until real NPC inventory exists, profession-specific bridge state should still be visible through character/NPC inspection where it matters. For hunters, a fuller `examine` can summarize the current lightweight torch bundle and claimed carcasses, while a brief `look` should stay closer to obvious visible state. Player-facing summaries should be approximate, e.g. a hunter has a reserve of torches or carries little/some/much prey, while scribe/admin views can keep exact marker counts.

When herbalists gain real or lightweight carried resources, full `examine` should summarize them in the same approximate way: for example no medicinal herbs, some berries, many mushrooms, or a bundle of herbs. Exact counts should remain for technical/admin views.

Food behavior should follow the same direction. A hunter who is hungry may process a fresh corpse, cook meat at a real campfire and eat. A herbalist who is hungry may eat carried or gathered berries and mushrooms, while later systems can distinguish food, medicine and risky forage more carefully.

## Current starter NPC

- Name: Здравомир
- Profession: знахар
- Start location: `start_border_camp`

The old generic label `Травник` should become a profession/fах, not a personal name.

## Design direction

Professions should eventually be derived from accumulated skills rather than assigned as rigid classes.

Examples:

- high gathering + herbalism + potion/tincture creation → знахар;
- tracking + trapping + hunting → мисливець;
- fishing + river knowledge + net crafting → рибалка;
- smithing + repair + metalwork → коваль.

A player should be able to earn the same social/professional labels that NPCs have.

## Future fisher NPC

A fisher NPC is planned for the riverbank. They should move between fishing spots, visibly prepare line or net, wait, catch or fail to catch fish, and become a source for learning basic fishing through observation or conversation.

This NPC should connect three systems:

- profession behavior: a person earns the label by repeatedly doing the work;
- survival/economy: fish can become food, barter goods or cooking input;
- progression: watching a successful catch may unlock Fishing once observation-based learning exists.

## Visibility and confusion

Without relevant observation/recognition skills, NPCs may look very similar to players:

- a person nearby may appear as “хтось”;
- profession may be unclear until the player observes actions or speaks with the NPC;
- names, professions and intentions should become clearer through attention, reputation and experience.
