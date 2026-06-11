const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  COMMANDS_TEXT_PAGES,
  HELP_TEXT,
  TUTORIAL_HELP_IN_DREAM_TEXT,
  TUTORIAL_HELP_RETURN_TEXT,
  helpTextForTutorialStatus,
  tutorialHelpFollowupText,
} = require("../../src/handlers/help");

assert.equal(Array.isArray(COMMANDS_TEXT_PAGES), true);
assert.equal(COMMANDS_TEXT_PAGES.length, 3);
assert.ok(COMMANDS_TEXT_PAGES[0].includes("/look"));
assert.ok(COMMANDS_TEXT_PAGES.some((page) => page.includes("/help")));
assert.equal(HELP_TEXT.includes("/commands"), false);
assert.ok(HELP_TEXT.includes("<i>Сліди</i> (/track)"));
assert.ok(HELP_TEXT.includes("<i>Сліди лисиці</i> (/track_fox)"));
assert.ok(HELP_TEXT.includes("<i>Сигнали</i> (/signals, сигнали)"));
assert.ok(HELP_TEXT.includes("Поклик духа"));
assert.ok(HELP_TEXT.includes("/spirit"));
assert.ok(HELP_TEXT.includes("/spirit_on"));
assert.ok(HELP_TEXT.includes("/spirit_off"));
assert.ok(HELP_TEXT.includes("<b>Навчання й увага</b>"));
assert.ok(HELP_TEXT.includes("<i>Слідування</i> (/follow_assist_on)"));
assert.ok(HELP_TEXT.includes("<i>Гурт</i> (/group)"));
assert.ok(HELP_TEXT.includes("<i>Приготувати настоянку</i> (/make_tincture)"));
assert.ok(HELP_TEXT.includes("<i>Випити настоянку</i> (/drink_tincture, <i>випити настоянку</i>)"));
assert.ok(HELP_TEXT.includes("власна атака або справжня сутичка поруч"));
assert.ok(HELP_TEXT.includes("без таблиць"));
assert.equal(HELP_TEXT.includes("/skills"), false);
assert.equal(HELP_TEXT.includes("XP"), false);
assert.equal(HELP_TEXT.includes("/auto_stop"), false);
assert.equal(HELP_TEXT.includes("стоп авто"), false);
assert.equal(HELP_TEXT.includes("Провід"), false);
assert.ok(HELP_TEXT.includes("AFK / відійти"));
assert.ok(HELP_TEXT.includes("13 хвилин"));
assert.equal(HELP_TEXT.includes("🌙 AFK"), false);
assert.equal(HELP_TEXT.includes("🚪 Завершити сесію"), false);
assert.equal(HELP_TEXT.includes("/give"), false);
assert.equal(HELP_TEXT.includes("/sit"), false);
assert.equal(HELP_TEXT.includes("/stand"), false);
assert.equal(HELP_TEXT.includes("/call_scribes"), false);
assert.equal(HELP_TEXT.includes("/search_honey"), false);
assert.equal(HELP_TEXT.includes("/dismantle_totem"), false);
assert.equal(HELP_TEXT.includes("/crawl"), false);
assert.equal(tutorialHelpFollowupText(false), TUTORIAL_HELP_RETURN_TEXT);
assert.equal(tutorialHelpFollowupText(true), TUTORIAL_HELP_IN_DREAM_TEXT);
assert.equal(helpTextForTutorialStatus(false), HELP_TEXT);
assert.equal(helpTextForTutorialStatus(true).includes("/sleep_tutorial"), false);
assert.ok(TUTORIAL_HELP_RETURN_TEXT.includes("повернутися туди"));
assert.equal(TUTORIAL_HELP_IN_DREAM_TEXT.includes("повернутися туди"), false);
assert.ok(TUTORIAL_HELP_IN_DREAM_TEXT.includes("ще триває"));

const commandsText = COMMANDS_TEXT_PAGES.join("\n");
assert.equal(commandsText.includes("/dukh"), false);
assert.equal(commandsText.includes("/dukh_on"), false);
assert.equal(commandsText.includes("/dukh_off"), false);
assert.equal(commandsText.includes("/auto_stop"), false);
assert.equal(commandsText.includes("стоп авто"), false);
assert.ok(commandsText.includes("/spirit_on"));
assert.ok(commandsText.includes("/spirit_off"));
assert.ok(commandsText.includes("/track_fox"));
assert.ok(commandsText.includes("/signals"));
assert.ok(commandsText.includes("сигнал, сигнали"));
assert.ok(commandsText.includes("/crawl"));
assert.ok(commandsText.includes("пролізти в щілину"));

const helpHandlerSource = fs.readFileSync("src/handlers/help.ts", "utf8");
assert.equal(helpHandlerSource.includes("export const HELP_TEXT = ["), false);
assert.equal(helpHandlerSource.includes("export const COMMANDS_TEXT_PAGES = ["), false);
assert.equal(helpHandlerSource.includes("function commandsPageKeyboard"), true);

console.log("Help tutorial follow-up OK");
