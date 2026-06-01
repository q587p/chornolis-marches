# Fire and light

Chornolis uses fire as an early survival and visibility tool.

## Campfires

- `/addCampfire` creates a new ordinary debug campfire in the player's current місцина.
- Multiple campfires can exist in the same місцина; every debug campfire receives its own key.
- A debug campfire burns for 8 in-game hours, currently mapped to 16 real minutes.
- During the final 2 in-game hours, currently 4 real minutes, location and feature text notes that the fire is fading.
- In that fading window, `/examine` shows the low-fire state: the campfire is догорає, but still lights the місцина until it expires.
- `/look` lists campfires only as visible features. `/examine` shows the gameplay meaning: whether the fire gives light, whether it improves rest, and whether it is fading or extinguished.
- In `/look`, an extinguished campfire should be listed only by name, e.g. `Згасле вогнище`. The ash/no-light/no-warmth details belong in `/examine`.
- After at least 1 in-game hour, currently 2 real minutes, a campfire feature can show `Додати хмиз`.
- `Додати хмиз`, `додати хмиз` and `/add twigs campfire` consume one `twigs` resource from inventory.
- For a burning ordinary campfire, `twigs` extends the remaining burn time by a small capped amount.
- For an extinguished ordinary campfire, `twigs` is tucked into the ashes as prepared fuel; it still needs a burning torch to relight.
- Seeded old ordinary campfires can reveal one short memory omen the first time they are fed or relit. This is atmospheric trace text, not a quest or reward, and the revealed trace remains readable in later `/examine` output.
- Magical campfires do not accept `twigs`: their point is that old magic sustains them without fuel.
- When a timed campfire expires, it remains in the місцина as `Згасле вогнище`: it gives no light and no rest bonus.
- A character with a still-burning torch can use `Підпалити` on a згасле вогнище to relight it with the default ordinary campfire timer.
- Seed data includes a few згаслі вогнища in the forest and dry luka as places that can be relit.

Expired timed campfires are turned into згаслі campfires lazily when location/light state is rendered or checked.

Player/admin-created ordinary campfires do not remain forever after they expire. Once they become згаслі campfires, they keep a two in-game day ash lifetime. During the final two in-game hours the feature becomes a `Ледь помітне вогнище` and the місцина gets one local notice that the ash is almost gone. If nobody adds хмиз or relights it before the end of that window, the feature is deactivated and disappears from ordinary location lists. Seeded old campfires are excluded from this cleanup because they are authored memory/omen landmarks.

The near-gone ash notice is proactive local chat. It is guarded once per ash feature, but a debug-heavy location with many ordinary campfires can still become noisy after several in-game days. The cleanup path uses the stored internal world clock through `WorldState`; deployments must already have the `0.14.1` `WorldState` migration before this cleanup runs.

## Torches

- Seed data includes a few loose `факел` ground items in forest, dry luka and riverbank locations. They appear under `Лежить` and can be picked up without a gather chance roll or action delay when the character is not exhausted.
- The starter border camp now points upward to a watchtower with a temporary infinite torch stand under its awning, while the closed settlement gate keeps its own temporary infinite torch stand. Their feature action is `Взяти факел`; later they should become limited-stock containers or bundles. The watchtower stand exists as first-session safety after darkness starts hiding details; do not remove the gate stand until hunter routes and gate-side supply are reviewed together.
- NPC hunter behavior may take or refresh a bounded hunting bundle from the gate torch stand, currently planned as five unlit torches, before routing to a magic campfire to light the first one. A hunter returning from the field can also be seeded with a visible lit torch and a spare torch represented by the current lightweight hunter bundle marker. This marker is temporary and should be replaced by real NPC-held inventory/light state as a high-priority follow-up, so NPC-held torches preserve burn timers and light locations like player-held torches. NPC-held lit torches should light the location even when the carrier is not otherwise visible to a particular viewer; if the carrier is explicitly hidden or stealth-like, an openly burning torch should reveal at least an uncertain bearer instead of producing ownerless hidden light. If the stand becomes limited stock, NPCs should use the same feature/container rules as players and avoid draining beginner-critical supply.
- Picking up a loose torch or taking one from a torch stand is visible to other characters in the location and is recorded for world/admin history.
- `/start`, `/reset` and ordinary bot startup do not add torches directly to player inventory. Development/scribe placement uses `/addTorch [персонаж] [кількість]`, which adds one or more torches to the current or named player's inventory.
- Near an active light-giving campfire, a character with a torch can use `Підпалити факел`.
- If the torch is already burning and the character carries another unlit torch, the action becomes `Підпалити ще один факел`.
- If the character already has a burning torch and no extra unlit torch, the same action becomes `Оновити вогонь на факелі` and resets its timer.
- From inventory, the `Light torch` / `Запалити факел` action appears when the character carries an unlit torch and can reach fire from either a lit campfire in the current location or another lit torch already in hand.
- From inventory, `Підкинути хмиз` appears when the character carries `twigs` and a nearby ordinary campfire can accept them.
- From inventory, `Притушити факел` appears while a carried torch is burning. It turns one `lit_torch` into a `doused_torch` and stores the remaining burn time so relighting continues from that point.
- Inventory fire action buttons should send the action result as a separate chat message, then refresh the inventory view separately instead of merging the action result into the inventory card.
- From inventory, `Викинути` on a carried burning torch drops it as a burning ground item instead of immediately extinguishing it. It remains visible under `Лежить`, lights the місцина while it still burns, and can be picked up again.
- A character can carry at most two lit torches at once, matching the current two-hands assumption.
- A lit torch lasts 5 in-game hours, currently 10 real minutes.
- During the final in-game hour, currently 2 real minutes, the world tick sends the character a separate chat warning that the torch is going out.
- When a lit torch burns out, inventory sync consumes `lit_torch` and returns `twigs` instead of a dry `torch`.
- A lit torch gives light in the character's current місцина and can reveal nearby targets in the same way as campfire light. This applies to carried lit torches, future NPC-held lit torches, and burning lit torches lying on the ground. Light is a local-world effect, not only a property of already-visible actors.

The current implementation stores torch state as inventory resources:

- `torch` is an unlit torch.
- `lit_torch` is a burning torch; its `updatedAt` timestamp is the active timer. The same temporary resource-stack timer is used for carried and dropped burning torches until real item instances exist.
- Dropped burning torches are still stack-based ground resources: one `ResourceNode` stack has one shared `updatedAt` timer. If several lit torches are lying together in the same location, they do not yet have separate per-torch burn timers.
- `doused_torch` is a doused torch; the remaining burn time is preserved through an internal timer event until it is relit.
- `twigs` / `хмиз` is the leftover fuel resource produced when a carried lit torch expires.

Seed/reset data also places small pickable `twigs` bundles in a few forest and dry-luka locations. They appear under `Лежить` and can be picked up like loose torches.

Natural forest fallback also lets `twigs` appear slowly on the ground. By default, once every 2 real hours the world tick checks the light-forest region and refreshes roughly one third of its locations by +1 `twigs`, but only while the local natural stack is below 5. Manual/admin placement, player drops and torch burn-out can still put more than 5 `twigs` in a location; the natural timer simply stops adding there until the amount is below the cap again.

This avoids a schema migration while preserving per-character torch timing.

## Timer notifications

- Timer warnings are chat events, not part of the місцина description.
- When a carried lit torch reaches the fading window, the owner gets one separate chat message.
- When a dropped lit torch burns out, the location gets a local message and a world event is recorded; the ground resource becomes `хмиз`.
- When a timed campfire reaches the fading window, characters in that місцина get one local chat message.
