const assert = require("node:assert/strict");

require("ts-node/register");

const {
  corpseResourceForms,
  corpseResourceKey,
  corpseResourceName,
  resourceAccusativeName,
  resourceDisplayName,
  resourceForms,
  resourceTypeDisplayName,
  resourceTypeGrammaticalGender,
} = require("../../src/utils/resourceText");
const { corpseMatchesQuery } = require("../../src/services/corpses");

const resource = (key, name = key) => ({ key, name });

assert.deepEqual(
  Object.fromEntries(
    [
      ["grass", "трава"],
      ["berries", "ягоди"],
      ["mushrooms", "гриби"],
      ["herbs", "лікарські трави"],
      ["torch", "факел"],
      ["lit_torch", "запалений факел"],
      ["doused_torch", "притушений факел"],
      ["twigs", "хмиз"],
      ["raw_meat", "сире м'ясо"],
      ["cooked_meat", "смажене м'ясо"],
      ["honey", "мед"],
      ["beeswax", "віск"],
    ].map(([key, expected]) => [key, resourceDisplayName(resource(key, "fallback")) === expected])
  ),
  {
    grass: true,
    berries: true,
    mushrooms: true,
    herbs: true,
    torch: true,
    lit_torch: true,
    doused_torch: true,
    twigs: true,
    raw_meat: true,
    cooked_meat: true,
    honey: true,
    beeswax: true,
  },
);

assert.deepEqual(
  Object.fromEntries(
    [
      ["grass", "траву"],
      ["berries", "ягоди"],
      ["mushrooms", "гриби"],
      ["herbs", "лікарські трави"],
      ["torch", "факел"],
      ["lit_torch", "факел"],
      ["doused_torch", "факел"],
      ["twigs", "хмиз"],
      ["raw_meat", "м’ясо"],
      ["cooked_meat", "м’ясо"],
      ["honey", "мед"],
      ["beeswax", "віск"],
    ].map(([key, expected]) => [key, resourceAccusativeName(resource(key, "fallback")) === expected])
  ),
  {
    grass: true,
    berries: true,
    mushrooms: true,
    herbs: true,
    torch: true,
    lit_torch: true,
    doused_torch: true,
    twigs: true,
    raw_meat: true,
    cooked_meat: true,
    honey: true,
    beeswax: true,
  },
);

assert.equal(resourceForms(resource("beeswax", "fallback")).genitive, "воску");
assert.equal(resourceForms(resource("raw_meat", "fallback")).instrumental, "сирим м'ясом");
assert.equal(resourceTypeDisplayName(resource("lit_torch", "fallback")), "запалений факел");
assert.equal(resourceTypeDisplayName(resource("corpse_mouse_male", "труп самця миші")), "труп миша");
assert.equal(resourceTypeGrammaticalGender(resource("raw_meat", "fallback")), "NEUTER");
assert.equal(resourceTypeGrammaticalGender(resource("berries", "fallback")), "PLURAL");
assert.equal(resourceTypeGrammaticalGender(resource("hand_axe", "fallback")), "FEMININE");

const creature = (key, sex) => ({
  sex,
  species: { key, name: key },
});

assert.equal(corpseResourceKey(creature("rabbit", "MALE")), "corpse_rabbit_male");
assert.equal(corpseResourceName(creature("rabbit", "MALE")), "труп зайця");
assert.equal(corpseResourceName(creature("rabbit", "FEMALE")), "труп зайчихи");
assert.equal(corpseResourceName(creature("mouse", "MALE")), "труп миша");
assert.equal(corpseResourceName(creature("mouse", "FEMALE")), "труп миші");
assert.equal(corpseResourceName(creature("fox", "MALE")), "труп лиса");
assert.equal(corpseResourceName(creature("fox", "FEMALE")), "труп лисиці");
assert.equal(corpseResourceName(creature("wolf", "MALE")), "труп вовка");
assert.equal(corpseResourceName(creature("wolf", "FEMALE")), "труп вовчиці");
assert.equal(corpseResourceName(creature("owl", "MALE")), "труп сови");
assert.equal(corpseResourceName(creature("owl", "FEMALE")), "труп сови");
assert.equal(corpseResourceForms(creature("fox", "MALE")).genitive, "трупа лиса");

assert.equal(resourceDisplayName(resource("corpse_rabbit_female", "fallback")), "труп зайчихи");
assert.equal(resourceDisplayName(resource("corpse_fox_male", "fallback")), "труп лиса");
assert.equal(resourceDisplayName(resource("corpse_wolf_female", "fallback")), "труп вовчиці");
assert.equal(resourceDisplayName(resource("corpse_owl_male", "fallback")), "труп сови");

assert.equal(corpseMatchesQuery(creature("rabbit", "FEMALE"), "труп зайчихи"), true);
assert.equal(corpseMatchesQuery(creature("fox", "MALE"), "лиса"), true);
assert.equal(corpseMatchesQuery(creature("mouse", "MALE"), "труп миша"), true);
assert.equal(corpseMatchesQuery(creature("wolf", "FEMALE"), "труп лисиці"), false);

console.log("Resource text helpers OK");
