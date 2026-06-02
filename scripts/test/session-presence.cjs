const assert = require("node:assert/strict");

process.env.AUTO_AFK_AFTER_MINUTES = "13";
process.env.AUTO_END_SESSION_AFTER_MINUTES = "60";

require("ts-node/register");

const {
  canSendPlayerActionMessage,
  canSendIdleReminder,
  canSendProactiveMessage,
  canSendScheduledIdleReminder,
  idleReminderSceneKeyForLocation,
  isAutoAfkDue,
  isAutoEndSessionDue,
  playerPresenceDisplaySuffix,
  renderSessionReturnHint,
  sessionPresenceLabel,
  sessionPresenceReasonLabel,
} = require("../../src/services/sessionPresence");

assert.equal(canSendProactiveMessage({ sessionPresence: "ACTIVE", remindersPaused: false }), true);
assert.equal(canSendProactiveMessage({ sessionPresence: "ACTIVE", remindersPaused: false, onboardingComplete: false }), false);
assert.equal(canSendProactiveMessage({ sessionPresence: "ACTIVE", remindersPaused: false, onboardingComplete: true }), true);
assert.equal(canSendProactiveMessage({ sessionPresence: "AFK", remindersPaused: false }), false);
assert.equal(canSendProactiveMessage({ sessionPresence: "ENDED", remindersPaused: false }), false);
assert.equal(canSendProactiveMessage({ sessionPresence: "ACTIVE", remindersPaused: true }), false);
assert.equal(canSendProactiveMessage(null), false);

assert.equal(canSendPlayerActionMessage({ sessionPresence: "ACTIVE", remindersPaused: false }, "auto:move"), true);
assert.equal(canSendPlayerActionMessage({
  sessionPresence: "AFK",
  sessionPresenceReason: "auto_afk",
  remindersPaused: true,
  onboardingComplete: true,
  autoActionMessagesEnabled: false,
}, "auto:move"), false);
assert.equal(canSendPlayerActionMessage({
  sessionPresence: "AFK",
  sessionPresenceReason: "auto_afk",
  remindersPaused: true,
  onboardingComplete: true,
  autoActionMessagesEnabled: true,
}, "auto:move"), true);
assert.equal(canSendPlayerActionMessage({
  sessionPresence: "AFK",
  sessionPresenceReason: "manual_afk",
  remindersPaused: true,
  onboardingComplete: true,
  autoActionMessagesEnabled: true,
}, "auto:move"), false);
assert.equal(canSendPlayerActionMessage({
  sessionPresence: "ENDED",
  sessionPresenceReason: "end_session",
  remindersPaused: true,
  onboardingComplete: true,
  autoActionMessagesEnabled: true,
}, "auto:move"), false);
assert.equal(canSendPlayerActionMessage({
  sessionPresence: "AFK",
  sessionPresenceReason: "auto_afk",
  remindersPaused: true,
  onboardingComplete: true,
  autoActionMessagesEnabled: true,
}, "manual:move"), false);

assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "AFK" }), " (відійшов)");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "AFK", grammaticalGender: "FEMININE" }), " (відійшла)");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "AFK", pronoun: "SHE" }), " (відійшла)");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "AFK", grammaticalGender: "NEUTER" }), " (відійшло)");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "AFK", grammaticalGender: "PLURAL" }), " (відійшли)");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "AFK", pronoun: "THEY" }), " (відійшли)");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "ACTIVE" }), "");
assert.equal(playerPresenceDisplaySuffix({ sessionPresence: "ENDED" }), "");
assert.equal(playerPresenceDisplaySuffix(null), "");

assert.equal(renderSessionReturnHint(null), null);
assert.equal(renderSessionReturnHint({ from: "ACTIVE", since: new Date("2026-05-30T12:00:00.000Z") }), null);
assert.ok(
  renderSessionReturnHint(
    { from: "AFK", since: new Date("2026-05-30T12:00:00.000Z") },
    new Date("2026-05-30T12:13:00.000Z")
  ).includes("13 хв")
);
assert.ok(
  renderSessionReturnHint(
    { from: "ENDED", since: new Date("2026-05-30T12:00:00.000Z") },
    new Date("2026-05-30T13:01:00.000Z")
  ).includes("сесія була завершена")
);

assert.equal(sessionPresenceReasonLabel("manual_afk"), "ручний AFK (/afk або кнопка)");
assert.equal(sessionPresenceReasonLabel("auto_afk"), "авто-AFK через неактивність");
assert.equal(sessionPresenceReasonLabel("auto_end_session"), "автозавершення сесії через довгу неактивність");
assert.equal(sessionPresenceReasonLabel("end_session"), "завершення сесії");
assert.equal(sessionPresenceReasonLabel("player_interaction"), "повернення через взаємодію");
assert.equal(sessionPresenceReasonLabel(null), "не записано");
assert.equal(
  sessionPresenceLabel({
    sessionPresence: "AFK",
    remindersPaused: true,
    sessionPresenceReason: "auto_afk",
    sessionPresenceChangedAt: new Date("2026-05-31T10:00:00.000Z"),
  }),
  "AFK / відійшов; нагадування на паузі; причина: авто-AFK через неактивність; змінено: 2026-05-31T10:00:00.000Z"
);
assert.equal(
  sessionPresenceLabel({ sessionPresence: "ENDED", remindersPaused: true, sessionPresenceReason: "end_session" }),
  "сесію завершено; нагадування на паузі; причина: завершення сесії"
);

const now = new Date("2026-05-30T12:13:00.000Z");
assert.equal(isAutoAfkDue({ sessionPresence: "ACTIVE", remindersPaused: false, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, now), true);
assert.equal(isAutoAfkDue({ sessionPresence: "ACTIVE", remindersPaused: false, lastPlayerActionAt: new Date("2026-05-30T12:01:00.000Z") }, now), false);
assert.equal(isAutoAfkDue({ sessionPresence: "AFK", remindersPaused: false, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, now), false);
assert.equal(isAutoAfkDue({ sessionPresence: "ACTIVE", remindersPaused: true, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, now), false);
assert.equal(isAutoAfkDue({ sessionPresence: "ACTIVE", remindersPaused: false, lastPlayerActionAt: null }, now), false);

const endNow = new Date("2026-05-30T13:00:00.000Z");
assert.equal(isAutoEndSessionDue({ sessionPresence: "ACTIVE", isAutoEnabled: false, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, endNow), true);
assert.equal(isAutoEndSessionDue({ sessionPresence: "AFK", isAutoEnabled: false, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, endNow), true);
assert.equal(isAutoEndSessionDue({ sessionPresence: "ACTIVE", isAutoEnabled: true, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, endNow), false);
assert.equal(isAutoEndSessionDue({ sessionPresence: "ENDED", isAutoEnabled: false, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, endNow), false);
assert.equal(isAutoEndSessionDue({ sessionPresence: "ACTIVE", isAutoEnabled: false, lastPlayerActionAt: new Date("2026-05-30T12:01:00.000Z") }, endNow), false);
assert.equal(isAutoEndSessionDue({ sessionPresence: "ACTIVE", isAutoEnabled: false, lastPlayerActionAt: null }, endNow), false);

assert.equal(idleReminderSceneKeyForLocation(42), "location:42");
assert.equal(canSendIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: "location:1",
  idleReminderSceneKey: null,
  idleReminderCountForCurrentScene: 0,
}), true);
assert.equal(canSendIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: "location:1",
  idleReminderSceneKey: "location:1",
  idleReminderCountForCurrentScene: 1,
}), false);
assert.equal(canSendIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: "location:2",
  idleReminderSceneKey: "location:1",
  idleReminderCountForCurrentScene: 1,
}), true);
assert.equal(canSendIdleReminder({
  sessionPresence: "AFK",
  remindersPaused: true,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: "location:1",
  idleReminderSceneKey: null,
  idleReminderCountForCurrentScene: 0,
}), false);
assert.equal(canSendIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: false,
  currentIdleReminderSceneKey: "location:1",
  idleReminderSceneKey: null,
  idleReminderCountForCurrentScene: 0,
}), false);
assert.equal(canSendIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: null,
  idleReminderSceneKey: "location:1",
  idleReminderCountForCurrentScene: 0,
}), false);
assert.equal(canSendScheduledIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: "location:2",
  idleReminderSceneKey: "location:1",
  idleReminderCountForCurrentScene: 0,
}, "location:1"), false);
assert.equal(canSendScheduledIdleReminder({
  sessionPresence: "ACTIVE",
  remindersPaused: false,
  awaitingPlayerInput: true,
  currentIdleReminderSceneKey: "location:2",
  idleReminderSceneKey: "location:1",
  idleReminderCountForCurrentScene: 0,
}, "location:2"), true);

console.log("Session presence OK");
