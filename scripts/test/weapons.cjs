const assert = require("node:assert/strict");

require("ts-node/register");

const {
  canWeaponFreshen,
  creatureAttackObserverText,
  freshenWeaponFailureText,
  heldWeaponLine,
  isWeaponResourceKey,
  legacyFresheningKnifeGrantText,
  playerAttackKillText,
  playerAttackObserverText,
  weaponForms,
  weaponName,
} = require("../../src/services/weapons");

assert.equal(isWeaponResourceKey("knife"), true);
assert.equal(isWeaponResourceKey("berries"), false);
assert.equal(weaponName("knife"), "простий ніж");
assert.equal(weaponForms("hand_axe").instrumental, "малою сокирою");

assert.equal(canWeaponFreshen("knife"), true);
assert.equal(canWeaponFreshen("sickle"), true);
assert.equal(canWeaponFreshen("hand_axe"), true);
assert.equal(canWeaponFreshen("short_sword"), true);
assert.equal(canWeaponFreshen("hunting_spear"), false);
assert.match(freshenWeaponFailureText(null), /потрібен ніж/);
assert.match(freshenWeaponFailureText("hunting_spear"), /Мисливський спис не підходить/);
assert.match(legacyFresheningKnifeGrantText(), /простий ніж/);
assert.match(legacyFresheningKnifeGrantText(), /Вимогу про гостре знаряддя/);

assert.equal(heldWeaponLine("knife"), "Тримає простий ніж.");
assert.equal(playerAttackKillText(null, "мишу"), "⚔️ Ви збиваєте мишу ногою. Труп лишився на землі.");
assert.match(playerAttackKillText("hunting_spear", "зайця"), /виставляєте спис/);
assert.match(playerAttackObserverText("knife", "мишу"), /простим ножем/);
assert.equal(playerAttackObserverText("knife", "мишу", "Аїд"), "Аїд збиває мишу простим ножем. Труп лишається на землі.");
assert.equal(playerAttackObserverText(null, "мишеня", "Радана"), "Радана збиває мишеня ногою. Труп лишається на землі.");
assert.equal(creatureAttackObserverText("Орина", "hunting_spear", "зайця"), "Орина виставляє мисливський спис і збиває зайця, тоді підбирає здобич для падального рову.");

console.log("Weapon helpers OK");
