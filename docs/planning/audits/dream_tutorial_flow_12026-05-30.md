# Dream Tutorial Flow Audit — 12026-05-30

Related item: `ONB-001-A`.

This is a planning audit of the current `Дрімотна Межа` tutorial after the recent keyboard, speech-gate, inventory, rest, wake and pacing fixes. It is not a playthrough transcript and does not add new runtime behavior.

## Current Path

1. Name/pronoun onboarding sends a new character into the tutorial dream.
2. Threshold and second-step rooms keep the ordinary keyboard shape but hide unavailable utility controls as placeholders.
3. The dream gate teaches visible locked exits and text-reactive world objects through `Сказати «Відчинитися»`.
4. The hub offers optional branches for gathering/inventory, sitting/resting/stamina, time, safety, observation and inside/outside movement.
5. Waking is available through the focused wake feature and direct `/wake`, not as a persistent main-keyboard action.
6. `/sleep tutorial` and unfinished-character fallbacks can return the player to the saved tutorial position.

## Works For Now

- The first two rooms are much quieter: `Допомога`, `Меню`, `Речі`, `Роздивитися` and status no longer appear before they are relevant.
- Returning to earlier dream cells no longer traps the player in the first-pass minimal keyboard.
- The gate lesson now points to reading/inspecting and speech, not brute `open`.
- Inventory appears after real inventory relevance instead of being exposed from the start.
- Rest remains distinct from sleep: the dream can say the player is sleeping while the in-dream posture/action says what they are doing there.
- Auto mode is blocked/disabled in dreams, so it should not consume tutorial steps for the player.

## Follow-ups

- `ONB-001-B`: add a one-time atmospheric hint after first `Озирнутися` that nudges toward closer examination.
- `ONB-001-C`: add a one-time hint after first `Роздивитися` that attention reveals useful signs, not just longer prose.
- `ONB-001-D`: polish the rest lesson now that sitting/resting/sleep layering exists.
- `ONB-001-E`: polish wake/return fallbacks and make sure unfinished characters can always find `/sleep tutorial` again.
- Later social tutorial slice: add Сон/Дрімота reactions for ordinary `say`, `shout`, `whisper`, `reply` and a small social-signal moment.
- Later observation slice: keep using the fox/track branch to teach that careful observation can lead to learning.

## No-action Decisions

- Do not put `Допомога` or `Меню` back into early dream rooms; the tutorial should teach through location text, local features and focused buttons.
- Do not add the wake button to the persistent dream keyboard; waking should stay a focused feature/action until ordinary sleep exists.
- Do not make the dream gate a generic `/open` lesson. Compatibility aliases may remain, but the tutorial-facing lesson should stay about reading and saying the right phrase.
- Do not turn the tutorial into a checklist. Each branch should remain optional and atmospheric unless it teaches a mechanic the player can immediately use.
