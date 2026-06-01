export type StarterAnimalAge = "CHILD" | "YOUNG" | "ADULT" | "OLD" | "CORPSE";
export type StarterAnimalSpeciesKey = "rabbit" | "mouse" | "fox" | "wolf" | "owl";

export type StarterAnimalGroup = {
  speciesKey: StarterAnimalSpeciesKey;
  locationKey: string;
  count: number;
  age: StarterAnimalAge;
  sex?: "MALE" | "FEMALE";
};

export const STARTER_RABBITS: StarterAnimalGroup[] = [
  { speciesKey: "rabbit", locationKey: "forest_04_00", count: 2, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "rabbit", locationKey: "forest_04_00", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "rabbit", locationKey: "forest_04_00", count: 3, age: "YOUNG" },
  { speciesKey: "rabbit", locationKey: "forest_04_00", count: 3, age: "CHILD" },

  { speciesKey: "rabbit", locationKey: "meadow_12_04", count: 2, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "rabbit", locationKey: "meadow_12_04", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "rabbit", locationKey: "meadow_12_04", count: 3, age: "YOUNG" },
  { speciesKey: "rabbit", locationKey: "meadow_12_04", count: 3, age: "CHILD" },

  { speciesKey: "rabbit", locationKey: "riverbank_15_02", count: 1, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "rabbit", locationKey: "riverbank_15_02", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "rabbit", locationKey: "riverbank_15_02", count: 2, age: "YOUNG" },

  { speciesKey: "rabbit", locationKey: "meadow_14_05", count: 2, age: "CORPSE" },
];

export const STARTER_MICE: StarterAnimalGroup[] = [
  { speciesKey: "mouse", locationKey: "forest_03_02", count: 2, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "mouse", locationKey: "forest_03_02", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "mouse", locationKey: "forest_03_02", count: 4, age: "YOUNG" },
  { speciesKey: "mouse", locationKey: "forest_03_02", count: 4, age: "CHILD" },

  { speciesKey: "mouse", locationKey: "meadow_11_04", count: 2, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "mouse", locationKey: "meadow_11_04", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "mouse", locationKey: "meadow_11_04", count: 4, age: "YOUNG" },
  { speciesKey: "mouse", locationKey: "meadow_11_04", count: 4, age: "CHILD" },

  { speciesKey: "mouse", locationKey: "riverbank_14_01", count: 2, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "mouse", locationKey: "riverbank_14_01", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "mouse", locationKey: "riverbank_14_01", count: 4, age: "YOUNG" },

  { speciesKey: "mouse", locationKey: "meadow_14_05", count: 2, age: "CORPSE" },
];

export const STARTER_PREDATORS: StarterAnimalGroup[] = [
  { speciesKey: "fox", locationKey: "forest_07_02", count: 1, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "fox", locationKey: "forest_07_02", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "fox", locationKey: "meadow_13_04", count: 1, age: "YOUNG", sex: "MALE" },
  { speciesKey: "wolf", locationKey: "forest_00_08", count: 1, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "owl", locationKey: "forest_04_02", count: 1, age: "ADULT", sex: "FEMALE" },
  { speciesKey: "owl", locationKey: "forest_09_04", count: 1, age: "ADULT", sex: "MALE" },
  { speciesKey: "owl", locationKey: "meadow_14_04", count: 1, age: "YOUNG", sex: "FEMALE" },
  { speciesKey: "owl", locationKey: "riverbank_13_00", count: 1, age: "ADULT", sex: "MALE" },
];

export function starterAnimalAgeTicks(
  species: { childTicks?: number; youngTicks?: number; adultTicks?: number },
  age: StarterAnimalAge,
  index: number
) {
  const childTicks = species.childTicks ?? 0;
  const youngTicks = species.youngTicks ?? 0;
  const adultTicks = species.adultTicks ?? 0;

  if (age === "CHILD") return Math.min(Math.max(0, childTicks - 1), 8 + index * 7);
  if (age === "YOUNG") return childTicks + 8 + index * 9;
  if (age === "ADULT") return childTicks + youngTicks + index * 12;
  if (age === "OLD") return childTicks + youngTicks + adultTicks + 10 + index * 18;
  return childTicks + youngTicks + adultTicks + 40 + index * 20;
}

export function starterAnimalHp(baseHp: number, age: StarterAnimalAge) {
  if (age === "CHILD") return Math.max(1, Math.round(baseHp * 0.35));
  if (age === "YOUNG") return Math.max(1, Math.round(baseHp * 0.75));
  if (age === "OLD") return Math.max(1, Math.round(baseHp * 0.65));
  if (age === "CORPSE") return 0;
  return baseHp;
}

export function starterAnimalAction(speciesKey: string, age: StarterAnimalAge) {
  if (speciesKey === "fox") {
    if (age === "YOUNG") return "винюхує мишачі ходи";
    if (age === "OLD") return "лежить у сухій траві й прислухається";
    return "крадеться низько між кущами";
  }
  if (speciesKey === "wolf") {
    if (age === "YOUNG") return "тримається краю зграї";
    if (age === "OLD") return "стереже старий слід";
    return "патрулює глибоку стежку";
  }
  if (speciesKey === "owl") {
    if (age === "YOUNG") return "вчиться слухати траву згори";
    if (age === "OLD") return "сидить у дуплі й повільно кліпає";
    if (age === "CORPSE") return "лежить нерухомо серед сірого пір'я";
    return "беззвучно дослухається до мишачого шарудіння";
  }
  if (speciesKey === "mouse") {
    if (age === "CHILD") return "пищить у сухій траві";
    if (age === "YOUNG") return "шурхотить між корінням";
    if (age === "OLD") return "повільно гріється під листям";
    if (age === "CORPSE") return "лежить нерухомо в прим'ятому мосі";
    return "прислухається й смикає вусами";
  }
  if (age === "CHILD") return "ховається в траві біля нори";
  if (age === "YOUNG") return "обережно вивчає нові запахи";
  if (age === "OLD") return "повільно ворушить вухами";
  if (age === "CORPSE") return "лежить нерухомо серед притоптаної трави";
  return "насторожено прислухається";
}
