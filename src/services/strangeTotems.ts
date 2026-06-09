import type { Bot } from "grammy";
import { Prisma, type Direction } from "@prisma/client";
import { prisma } from "../db";
import { MINUTES_PER_WORLD_DAY } from "../data/worldClock";
import { TRACK_TTL_MS } from "../gameConfig";
import { directionLabels } from "../ui/labels";
import { chance, pick, randomInt } from "../utils/random";
import { canPickUpGroundItem } from "./groundItems";
import { ensureTorchResourceTypes } from "./fire";
import { notifyLocationAll } from "./notifications";
import { ensureWorldState } from "./worldTime";

type JsonRecord = Record<string, unknown>;
type StrangeTotemFeatureLike = {
  id?: number;
  key?: string | null;
  type?: string | null;
  name?: string | null;
  description?: string | null;
  data?: unknown | null;
  isActive?: boolean | null;
  locationId?: number | null;
  location?: { key?: string | null; region?: { key?: string | null } | null } | null;
};

export const STRANGE_TOTEM_REGION_CAPS = {
  dry_luka: 13,
  riverbank: 3,
  chornolis_border: 5,
  willow_floodplain: 1,
} as const;
export const STRANGE_TOTEM_PROTECTED_REGION_KEYS = [
  "starter_camp",
  "old_bridge",
  "closed_settlement_gate",
  "dream_tutorial",
] as const;
export const STRANGE_TOTEM_LIFETIME_DAYS = 7;
export const STRANGE_TOTEM_LAST_DAY_START_DAYS = 6;
export const STRANGE_TOTEM_FRESH_TWIGS_MIN = 2;
export const STRANGE_TOTEM_FRESH_TWIGS_MAX = 3;
export const STRANGE_TOTEM_OLD_TWIGS = 1;
export const STRANGE_TOTEM_DAILY_SPAWN_EVENT_TITLE = "Strange totem daily spawn attempt";
export const STRANGE_TOTEM_TRACK_ACTOR_SPECIES_KEY = "strange_totem_trace";
export const STRANGE_TOTEM_TRACK_TTL_MS = Number(process.env.WORLD_STRANGE_TOTEM_TRACK_TTL_MS || TRACK_TTL_MS * 3);
const STRANGE_TOTEM_DAILY_CHANCE = Number(process.env.WORLD_STRANGE_TOTEM_DAILY_CHANCE || 35);

export const STRANGE_TOTEM_ALIASES = [
  "тотем",
  "підозрілий тотем",
  "дивний тотем",
  "знак",
  "дивний знак",
  "вузлик",
  "сухий вузлик",
  "хмизовий знак",
];

const TOTEM_NAMES = [
  "Підозрілий тотем",
  "Кривий знак із лози",
  "Вузлик із сухого очерету",
  "Мала трав'яна постать",
  "Хмизовий знак",
  "Сухий сторож",
];

const DRY_LUKA_DESCRIPTIONS = [
  "Кілька сухих стебел, тонка лозина й клаптик темної кори зв'язані в малу криву постать. Вона не схожа ні на межовий знак, ні на дитячу забавку.",
  "Сухі стебла стоять у траві надто рівно, ніби їх хтось обережно втиснув у землю і стягнув тонкою лозиною.",
  "Малий вузол із трави й кори повернутий до стежки. Його легко було б сплутати з хмизом, якби не надто навмисна форма.",
  "Пучок ковили перев'язаний сухою жилкою лози, а зверху встромлено маленький уламок кори. Уся постать нахилена так, ніби слухає луку.",
  "Серед пожовклої трави стоїть вузький хмизовий знак. Його тінь коротша за інші тіні й чомусь лягає впоперек стежки.",
  "Три сухі стеблини зведені докупи, мов ноги малої постаті, а між ними затиснуто сірий листок. Вітер торкає траву довкола, але знак не ворушиться.",
  "У низькій траві хтось склав маленьке ребристе коло з кори й тонких прутиків. Воно не перекриває шлях, але око весь час повертається до нього.",
  "Поряд із кущиком полину стоїть сухий вузлик, обвитий блідою лозою. Від нього тягнеться ледь помітна смужка прим'ятої трави.",
  "Дві лозини схрещені над жмутом сірої трави, наче хтось позначив місце без жодного людського знака. Нічого корисного тут не видно, крім самого неспокою.",
  "Кора, стебла й сухий будяк стягнуті в маленьку постать із неприродно рівною спиною. У відкритій луці вона виглядає занадто сторожкою.",
  "Низький знак із хмизу стоїть між двома заячими стежками. Він ніби показує не напрямок, а саму думку про напрямок.",
  "У траві лишено вузол із сухих перев'язів і темної кори. Його можна було б розтоптати випадково, та форма просить спершу придивитися.",
  "Малий сухий стовпчик обкладений стеблами так, ніби це не стовпчик, а чиясь зігнута постать. На землі біля нього немає звичайних слідів рук.",
];

const RIVERBANK_DESCRIPTIONS = [
  "Очеретини скручені в маленьку постать і стягнуті мокрою лозою. Внизу налип мул, хоча навколо трава сухіша.",
  "Біля берега стоїть низький очеретяний знак. Він майже сором'язливий, але від цього не стає випадковим.",
  "Мокрий корінець тримає разом кілька трісок і стебел очерету. На мулі під ними видно тонкий знак, наче вода щойно відступила тільки тут.",
  "Плавун і дрібна кора сплетені в криву фігуру на самому краю вогкої землі. Поряд у воді повільно розходяться кола, хоча нічого не впало.",
  "Знак зібраний із намоклого хмизу, річкового мулу й тонких зелених стебел. Він повернутий не до стежки, а до тихого місця між течією й берегом.",
];

const CHORNOLIS_BORDER_DESCRIPTIONS = [
  "На межі між деревами стоїть вузол із корінців і темної кори. Він низький, але тримається так, наче підпирає тінь старого лісу.",
  "Сухі гілочки зведені в малу постать біля кореня. З одного боку пахне відкритою землею, з іншого — вологим лісом, і знак стоїть рівно посеред цього подиху.",
  "Тонка лоза обмотує тріску й жмут моху. Постать повернута до стежки з такою впертістю, ніби позначає не місце, а поріг.",
  "Між двома коренями лишено хмизовий знак із темним шматком кори замість лиця. За ним ліс виглядає глибшим, ніж мав би з цієї відстані.",
  "Кілька старих корінців стягнуті сухою травою в маленького сторожа. Він стоїть там, де край лісу ніби вагається, чи пускати далі.",
  "Під кущем лежить і водночас стоїть дивна постать із кори, моху й тонких прутиків. Вона схожа на річ, яку поставили на межі, щоб межа пам'ятала себе.",
];

const WILLOW_FLOODPLAIN_DESCRIPTIONS = [
  "Вербові корінці, мокрий очерет і темна тріска зв'язані в малий знак над вогкою землею. Довкола пахне мулом і стоячою водою, а сама постать здається принесеною повінню й залишеною навмисно.",
];

export const STRANGE_TOTEM_DESCRIPTION_POOLS = {
  dry_luka: DRY_LUKA_DESCRIPTIONS,
  riverbank: RIVERBANK_DESCRIPTIONS,
  chornolis_border: CHORNOLIS_BORDER_DESCRIPTIONS,
  willow_floodplain: WILLOW_FLOODPLAIN_DESCRIPTIONS,
} as const;

const TRACK_LABELS = [
  "підозрілі сліди в сухій траві",
  "тонкі сліди біля дивного знака",
  "загадкові сліди від хмизового вузла",
  "прим'ята трава коло підозрілого тотема",
  "слід, ніби хтось ішов дуже обережно",
];

export const STRANGE_TOTEM_DISMANTLE_FLOURISHES = [
  "Коли останній вузол розпустився, вітер на мить стих.",
  "Остання лозина тріснула так тихо, ніби хтось за деревами затамував подих.",
  "Під травою ворухнувся холодок, але за мить місцина знову стала просто місциною.",
  "Клаптик темної кори впав лицем до землі, і від цього знак остаточно втратив подобу.",
  "Суха трава навколо поволі випросталася, наче давно чекала, коли їй дадуть спокій.",
  "У розпущеному вузлі на мить блиснула пилюка, тонка й сіра, мов попіл без вогню.",
  "Лозини розійшлися в руках легко, аж надто легко для того, що так уперто стояло.",
  "Після останнього руху стало чути дрібний шелест трави там, де щойно мовчав знак.",
  "Один уламок кори перевернувся сам, показавши чистий бік без жодної подряпини.",
  "Тінь від постаті зламалася на кілька простих гілочок і вже не збиралася докупи.",
  "Найтугіший перев'яз розсипався сухим пилом, лишивши на пальцях гіркуватий запах кори.",
  "Над хмизом пройшла коротка хвиля тиші, а тоді повернулися звичайні звуки місцини.",
  "Те, що тримало форму тотема, відступило без голосу, тільки стебла непевно здригнулися.",
] as const;

export const STRANGE_TOTEM_NPC_DISMANTLE_LINES = [
  "присідає біля підозрілого тотема й розпускає найтугіший вузол першим",
  "нахиляє голову до хмизової постаті, ніби слухає, куди вона дивиться, а тоді розбирає її",
  "торкається сухої лози двома пальцями й поволі знімає знак із землі",
  "обходить тотем півколом, знаходить прихований перев'яз і тягне саме за нього",
  "ламає криву постать не силою, а терплячим рухом, стебло за стеблом",
  "відсовує траву довкола знака й розбирає його так, щоб не лишити форми",
  "притискає хмизовий знак до землі й розпускає лозу, поки він не стає просто гіллям",
  "дивиться на тотем без привітання й розбирає його, наче прибирає чужий слід",
  "знімає з тотема темний уламок кори, і вся мала постать одразу втрачає впертість",
  "перевіряє землю під знаком, а потім розбирає його короткими обережними рухами",
  "не лишає підозрілий знак стояти: знаходить сухий вузол і розпускає його до кінця",
  "обережно витягає лозини з трави, щоб знак більше не дивився на стежку",
  "стискає губи біля кривої постаті й розбирає її так тихо, ніби гасить поганий шепіт",
] as const;

function featureData(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function jsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function numberFromData(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : null;
}

function stableIndex(value: string, modulo: number) {
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % Math.max(1, modulo);
}

export function isStrangeTotemFeature(feature: StrangeTotemFeatureLike) {
  const data = featureData(feature.data);
  return feature.isActive !== false && feature.type === "LANDMARK" && data.strange_totem === true;
}

export function strangeTotemRegionCap(regionKey: string | null | undefined) {
  return regionKey && regionKey in STRANGE_TOTEM_REGION_CAPS
    ? STRANGE_TOTEM_REGION_CAPS[regionKey as keyof typeof STRANGE_TOTEM_REGION_CAPS]
    : 0;
}

export function isStrangeTotemProtectedSpawnLocation(location: { key?: string | null; region?: { key?: string | null } | null }) {
  const regionKey = location.region?.key ?? "";
  if ((STRANGE_TOTEM_PROTECTED_REGION_KEYS as readonly string[]).includes(regionKey)) return true;
  return false;
}

export function strangeTotemDayIndex(absoluteMinute: number) {
  return Math.floor(Math.max(0, absoluteMinute) / MINUTES_PER_WORLD_DAY);
}

export function strangeTotemDailySpawnMarker(dayIndex: number) {
  return `strangeTotemDay:${Math.floor(Math.max(0, dayIndex))};`;
}

export function strangeTotemSchedule(feature: StrangeTotemFeatureLike, absoluteMinute: number) {
  const data = featureData(feature.data);
  const spawnedAtMinute = numberFromData(data.spawnedAtMinute) ?? Math.floor(absoluteMinute);
  const fadingAtMinute = numberFromData(data.fadingAtMinute) ?? spawnedAtMinute + STRANGE_TOTEM_LAST_DAY_START_DAYS * MINUTES_PER_WORLD_DAY;
  const expiresAtMinute = numberFromData(data.expiresAtMinute) ?? spawnedAtMinute + STRANGE_TOTEM_LIFETIME_DAYS * MINUTES_PER_WORLD_DAY;
  return { spawnedAtMinute, fadingAtMinute, expiresAtMinute };
}

export function strangeTotemAgeState(feature: StrangeTotemFeatureLike, absoluteMinute: number): "fresh" | "old" | "expired" {
  const schedule = strangeTotemSchedule(feature, absoluteMinute);
  if (absoluteMinute >= schedule.expiresAtMinute) return "expired";
  if (absoluteMinute >= schedule.fadingAtMinute) return "old";
  return "fresh";
}

export function strangeTotemRecoveredTwigs(feature: StrangeTotemFeatureLike, absoluteMinute: number) {
  const data = featureData(feature.data);
  const state = strangeTotemAgeState(feature, absoluteMinute);
  if (state === "expired") return 0;
  if (state === "old" || data.lastDayTwigDroppedAtMinute != null) return numberFromData(data.twigsOld) ?? STRANGE_TOTEM_OLD_TWIGS;

  const min = numberFromData(data.twigsFreshMin) ?? STRANGE_TOTEM_FRESH_TWIGS_MIN;
  const max = numberFromData(data.twigsFreshMax) ?? STRANGE_TOTEM_FRESH_TWIGS_MAX;
  return min + stableIndex(String(feature.key ?? feature.id ?? "strange_totem"), Math.max(1, max - min + 1));
}

export function strangeTotemDismantleText(recovered: number, seed = "") {
  const flourish = STRANGE_TOTEM_DISMANTLE_FLOURISHES[stableIndex(seed || String(recovered), STRANGE_TOTEM_DISMANTLE_FLOURISHES.length)];
  return recovered > 1
    ? `🧹 Ви розібрали підозрілий тотем. Сухі стебла, лозини й кора стали хмизом ×${recovered}.\n\n${flourish}`
    : `🧹 Тотем майже розсипався від дотику. Придатного хмизу лишилося тільки на одну в'язку.\n\n${flourish}`;
}

export function strangeTotemNpcDismantleLine(seed = "") {
  return STRANGE_TOTEM_NPC_DISMANTLE_LINES[stableIndex(seed || "strange_totem_npc", STRANGE_TOTEM_NPC_DISMANTLE_LINES.length)];
}

export function strangeTotemDetailLine(feature: StrangeTotemFeatureLike, absoluteMinute?: number) {
  const state = absoluteMinute == null ? "fresh" : strangeTotemAgeState(feature, absoluteMinute);
  if (state === "old") return "давно стоїть тут; скоро розсиплеться сам";
  if (state === "expired") return "розсипається на труху і майже не тримає форми";
  return "виглядає навмисно складеним; можна розібрати на хмиз";
}

export function strangeTotemInspectionTextSync(feature: StrangeTotemFeatureLike, absoluteMinute: number) {
  const data = featureData(feature.data);
  const regionKey = feature.location?.region?.key;
  const baseDescription = feature.description
    ?? strangeTotemDescriptionPoolForRegion(regionKey)[0];
  const state = strangeTotemAgeState(feature, absoluteMinute);

  if (state === "old") {
    const dropped = data.lastDayTwigDroppedAtMinute != null
      ? "\n\nБіля основи вже лежить кілька сухих уламків. Сам знак тримається радше з упертості, ніж із міцності."
      : "";
    return [
      baseDescription,
      "",
      "Тотем уже давно тут. Сухі вузли розпускаються, стебла кришаться від вітру, а низ постаті просів у траву.",
      "",
      "Схоже, скоро він розвалиться сам. Придатного хмизу лишиться хіба на одну в'язку.",
      dropped,
    ].join("\n");
  }

  if (state === "expired") {
    return [
      baseDescription,
      "",
      "Знак майже розпався. Те, що мало форму, стало трухою, пилом і сухим шурхотом у траві.",
    ].join("\n");
  }

  return [
    baseDescription,
    "",
    "Він не схожий ні на межовий знак, ні на дитячу забавку: надто обережно зав'язаний, надто навмисно повернутий до стежки.",
    "",
    "Такі речі краще не лишати стояти без потреби. Якщо розібрати його, має вийти трохи хмизу.",
  ].join("\n");
}

export async function strangeTotemInspectionText(feature: StrangeTotemFeatureLike, absoluteMinute: number) {
  return strangeTotemInspectionTextSync(feature, absoluteMinute);
}

function dataWithSchedule(feature: StrangeTotemFeatureLike, absoluteMinute: number): JsonRecord {
  const data = featureData(feature.data);
  const schedule = strangeTotemSchedule(feature, absoluteMinute);
  return { ...data, ...schedule };
}

function hasSchedule(feature: StrangeTotemFeatureLike) {
  const data = featureData(feature.data);
  return data.spawnedAtMinute != null && data.fadingAtMinute != null && data.expiresAtMinute != null;
}

async function currentWorldMinute() {
  const state = await ensureWorldState();
  return state.absoluteMinute;
}

async function addGroundTwigs(tx: Prisma.TransactionClient, locationId: number, resourceTypeId: number, amount: number) {
  if (amount <= 0) return;
  await tx.resourceNode.upsert({
    where: { locationId_resourceTypeId: { locationId, resourceTypeId } },
    update: { amount: { increment: amount } },
    create: { locationId, resourceTypeId, amount, maxAmount: amount },
  });
}

export async function ageStrangeTotemsIfNeeded(bot?: Bot | null, absoluteMinute?: number) {
  const currentMinute = absoluteMinute ?? await currentWorldMinute();
  const features = await prisma.locationFeature.findMany({
    where: { isActive: true, type: "LANDMARK" },
    include: { location: { include: { region: true } } },
  });

  let scheduled = 0;
  let dropped = 0;
  let expired = 0;

  for (const feature of features.filter(isStrangeTotemFeature)) {
    const data = dataWithSchedule(feature, currentMinute);
    if (!hasSchedule(feature)) {
      await prisma.locationFeature.update({
        where: { id: feature.id },
        data: { data: jsonInput(data) },
      });
      scheduled++;
    }

    const scheduledFeature = { ...feature, data };
    const state = strangeTotemAgeState(scheduledFeature, currentMinute);
    if (state === "expired") {
      await prisma.locationFeature.update({
        where: { id: feature.id },
        data: {
          isActive: false,
          name: "Слід від підозрілого тотема",
          data: jsonInput({ ...data, decayedAtMinute: currentMinute }),
        },
      });
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Strange totem decayed",
          description: `feature=${feature.key}; minute=${currentMinute}`,
          locationId: feature.locationId,
        },
      });
      expired++;
      continue;
    }

    if (state === "old" && data.lastDayTwigDroppedAtMinute == null && feature.locationId) {
      const { twigs } = await ensureTorchResourceTypes();
      await prisma.$transaction(async (tx) => {
        await addGroundTwigs(tx, feature.locationId, twigs.id, STRANGE_TOTEM_OLD_TWIGS);
        await tx.locationFeature.update({
          where: { id: feature.id },
          data: {
            name: "Старий підозрілий тотем",
            data: jsonInput({ ...data, lastDayTwigDroppedAtMinute: currentMinute }),
          },
        });
        await tx.worldEvent.create({
          data: {
            type: "SYSTEM",
            title: "Strange totem shed twigs",
            description: `feature=${feature.key}; minute=${currentMinute}; twigs=1`,
            locationId: feature.locationId,
          },
        });
      });
      dropped++;
      if (bot) await notifyLocationAll(bot, feature.locationId, "🪵 Старий підозрілий тотем осипався. У траві лишився придатний хмиз.");
    }
  }

  return { scheduled, dropped, expired };
}

function spawnChancePercent() {
  return Number.isFinite(STRANGE_TOTEM_DAILY_CHANCE) ? Math.max(0, Math.min(100, STRANGE_TOTEM_DAILY_CHANCE)) : 35;
}

async function activeTotemCountsByRegion() {
  const active = await prisma.locationFeature.findMany({
    where: {
      isActive: true,
      type: "LANDMARK",
      location: { region: { key: { in: Object.keys(STRANGE_TOTEM_REGION_CAPS) } } },
    },
    include: { location: { include: { region: true } } },
  });

  const counts = new Map<string, number>();
  for (const feature of active.filter(isStrangeTotemFeature)) {
    const key = feature.location?.region?.key;
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

async function eligibleSpawnLocations(counts: Map<string, number>) {
  const regionKeys = Object.keys(STRANGE_TOTEM_REGION_CAPS);
  const locations = await prisma.cellLocation.findMany({
    where: { region: { key: { in: regionKeys } } },
    include: {
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true } },
      features: { where: { isActive: true, type: "LANDMARK" } },
    },
  });

  return locations.filter((location) => {
    const cap = strangeTotemRegionCap(location.region.key);
    if (cap <= 0 || (counts.get(location.region.key) ?? 0) >= cap) return false;
    if (isStrangeTotemProtectedSpawnLocation(location)) return false;
    if (location.features.some(isStrangeTotemFeature)) return false;
    return location.exitsFrom.length > 0;
  });
}

async function ensureTotemTrackActor(locationId: number) {
  const species = await prisma.creatureSpecies.upsert({
    where: { key: STRANGE_TOTEM_TRACK_ACTOR_SPECIES_KEY },
    update: {
      name: "слід підозрілого тотема",
      description: "Службова невидима прив'язка для загадкових слідів тотемів.",
    },
    create: {
      key: STRANGE_TOTEM_TRACK_ACTOR_SPECIES_KEY,
      name: "слід підозрілого тотема",
      description: "Службова невидима прив'язка для загадкових слідів тотемів.",
      kind: "SPIRIT",
      diet: "SPIRITUAL",
      baseHp: 1,
      strength: 0,
      agility: 0,
      perception: 0,
      endurance: 0,
      instinct: 0,
      oldDeathChancePermille: 0,
      oldDeathChanceGrowthPermille: 0,
      corpseDecayTicks: 1,
    },
  });

  const existing = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: "слід підозрілого тотема", isGone: true },
    orderBy: { id: "asc" },
  });
  if (existing) {
    return prisma.creature.update({
      where: { id: existing.id },
      data: { locationId, isAlive: true, isGone: true, isHidden: true, activity: "SLEEPING", currentAction: "не проявляється" },
    });
  }

  return prisma.creature.create({
    data: {
      speciesId: species.id,
      locationId,
      name: "слід підозрілого тотема",
      hp: 1,
      maxHp: 1,
      stamina: 0,
      staminaMax: 0,
      activity: "SLEEPING",
      currentAction: "не проявляється",
      isAlive: true,
      isGone: true,
      isHidden: true,
      age: "ADULT",
      sex: "MALE",
    },
  });
}

export function strangeTotemDescriptionPoolForRegion(regionKey: string | null | undefined) {
  return regionKey && regionKey in STRANGE_TOTEM_DESCRIPTION_POOLS
    ? STRANGE_TOTEM_DESCRIPTION_POOLS[regionKey as keyof typeof STRANGE_TOTEM_DESCRIPTION_POOLS]
    : DRY_LUKA_DESCRIPTIONS;
}

export function strangeTotemDescriptionForRegion(regionKey: string | null | undefined) {
  return pick(strangeTotemDescriptionPoolForRegion(regionKey));
}

export async function maybeSpawnDailyStrangeTotem(bot?: Bot | null, absoluteMinute?: number) {
  const currentMinute = absoluteMinute ?? await currentWorldMinute();
  const dayIndex = strangeTotemDayIndex(currentMinute);
  const marker = strangeTotemDailySpawnMarker(dayIndex);
  const existing = await prisma.worldEvent.findFirst({
    where: {
      type: "SYSTEM",
      title: STRANGE_TOTEM_DAILY_SPAWN_EVENT_TITLE,
      description: { contains: marker },
    },
  });
  if (existing) return { attempted: false, spawned: false, reason: "already_attempted" };

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: STRANGE_TOTEM_DAILY_SPAWN_EVENT_TITLE,
      description: `${marker} chance=${spawnChancePercent()}`,
    },
  });

  if (!chance(spawnChancePercent())) return { attempted: true, spawned: false, reason: "chance" };

  const counts = await activeTotemCountsByRegion();
  const candidates = await eligibleSpawnLocations(counts);
  if (!candidates.length) return { attempted: true, spawned: false, reason: "no_candidate" };

  const location = pick(candidates);
  const exit = pick(location.exitsFrom);
  const direction = exit.direction as Direction;
  const schedule = {
    spawnedAtMinute: currentMinute,
    fadingAtMinute: currentMinute + STRANGE_TOTEM_LAST_DAY_START_DAYS * MINUTES_PER_WORLD_DAY,
    expiresAtMinute: currentMinute + STRANGE_TOTEM_LIFETIME_DAYS * MINUTES_PER_WORLD_DAY,
  };
  const featureKey = `strange_totem_${location.key}_${dayIndex}_${randomInt(1000, 9999)}`;

  const feature = await prisma.locationFeature.create({
    data: {
      key: featureKey,
      locationId: location.id,
      type: "LANDMARK",
      name: pick(TOTEM_NAMES),
      description: strangeTotemDescriptionForRegion(location.region.key),
      isActive: true,
      providesLight: false,
      restStaminaCapMultiplier: null,
      data: jsonInput({
        icon: "🪵",
        inspectable: true,
        strange_totem: true,
        spawned_by: "ambient",
        future_hook: "totem_makers",
        twigsFreshMin: STRANGE_TOTEM_FRESH_TWIGS_MIN,
        twigsFreshMax: STRANGE_TOTEM_FRESH_TWIGS_MAX,
        twigsOld: STRANGE_TOTEM_OLD_TWIGS,
        traceDirection: direction,
        aliases: STRANGE_TOTEM_ALIASES,
        ...schedule,
      }),
    },
  });

  const actor = await ensureTotemTrackActor(location.id);
  await prisma.worldTrack.create({
    data: {
      actorType: "CREATURE",
      creatureId: actor.id,
      fromLocationId: location.id,
      toLocationId: exit.toLocationId,
      direction,
      label: pick(TRACK_LABELS),
      strength: 2,
      expiresAt: new Date(Date.now() + STRANGE_TOTEM_TRACK_TTL_MS),
    },
  });

  const directionLabel = directionLabels[direction] ?? direction;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Strange totem spawned",
      description: `feature=${feature.key}; location=${location.key}; direction=${direction}; ${directionLabel}`,
      locationId: location.id,
    },
  });
  if (bot) await notifyLocationAll(bot, location.id, `🪵 У місцині з'явився малий підозрілий тотем. Він повернутий до ${directionLabel.toLocaleLowerCase("uk-UA")}; поруч лишилися тонкі сліди.`);

  return { attempted: true, spawned: true, reason: "spawned", featureId: feature.id, locationId: location.id };
}

export async function dismantleStrangeTotem(playerId: number, featureId: number) {
  const currentMinute = await currentWorldMinute();
  const { twigs } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб розбирати тотем просто зараз. Спершу перепочиньте.");

  const feature = await prisma.locationFeature.findFirst({
    where: { id: featureId, locationId: player.currentLocationId, isActive: true, type: "LANDMARK" },
    include: { location: { include: { region: true } } },
  });
  if (!feature || !isStrangeTotemFeature(feature)) throw new Error("Тут немає тотема, який можна розібрати.");

  const data = dataWithSchedule(feature, currentMinute);
  const scheduledFeature = { ...feature, data };
  const recovered = strangeTotemRecoveredTwigs(scheduledFeature, currentMinute);

  await prisma.$transaction(async (tx) => {
    await tx.locationFeature.update({
      where: { id: feature.id },
      data: {
        isActive: false,
        name: "Розібраний підозрілий тотем",
        data: jsonInput({
          ...data,
          dismantledAtMinute: currentMinute,
          dismantledByPlayerId: playerId,
          recoveredTwigs: recovered,
        }),
      },
    });
    if (recovered > 0) {
      await tx.playerResource.upsert({
        where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
        update: { amount: { increment: recovered } },
        create: { playerId, resourceTypeId: twigs.id, amount: recovered },
      });
    }
    await tx.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: "Strange totem dismantled",
        description: `player=${playerId}; feature=${feature.key}; recoveredTwigs=${recovered}`,
        playerId,
        locationId: feature.locationId,
      },
    });
  });

  const text = strangeTotemDismantleText(recovered, String(feature.key ?? feature.id ?? featureId));

  return {
    text,
    recoveredTwigs: recovered,
    locationId: feature.locationId,
  };
}

export async function dismantleStrangeTotemByCreature(creatureId: number, featureId: number) {
  const currentMinute = await currentWorldMinute();
  const { twigs } = await ensureTorchResourceTypes();
  const creature = await prisma.creature.findUnique({
    where: { id: creatureId },
    select: { id: true, name: true, locationId: true, isAlive: true, isGone: true },
  });
  if (!creature?.locationId || !creature.isAlive || creature.isGone) throw new Error("Creature cannot dismantle a totem right now.");

  const feature = await prisma.locationFeature.findFirst({
    where: { id: featureId, locationId: creature.locationId, isActive: true, type: "LANDMARK" },
    include: { location: { include: { region: true } } },
  });
  if (!feature || !isStrangeTotemFeature(feature)) throw new Error("No active strange totem is available for the creature to dismantle.");

  const data = dataWithSchedule(feature, currentMinute);
  const scheduledFeature = { ...feature, data };
  const recovered = strangeTotemRecoveredTwigs(scheduledFeature, currentMinute);
  const line = strangeTotemNpcDismantleLine(`${creatureId}:${feature.key ?? feature.id}`);

  await prisma.$transaction(async (tx) => {
    await tx.locationFeature.update({
      where: { id: feature.id },
      data: {
        isActive: false,
        name: "Розібраний підозрілий тотем",
        data: jsonInput({
          ...data,
          dismantledAtMinute: currentMinute,
          dismantledByCreatureId: creatureId,
          recoveredTwigs: recovered,
        }),
      },
    });
    if (recovered > 0) {
      await tx.creatureResource.upsert({
        where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: twigs.id } },
        update: { amount: { increment: recovered } },
        create: { creatureId, resourceTypeId: twigs.id, amount: recovered },
      });
    }
    await tx.creature.updateMany({
      where: { id: creatureId, isAlive: true, isGone: false },
      data: { activity: "LOOKING", currentAction: line },
    });
    await tx.worldEvent.create({
      data: {
        type: "NPC_ACTION",
        title: "Strange totem dismantled by profession NPC",
        description: `creature=${creatureId}; feature=${feature.key}; recoveredTwigs=${recovered}`,
        locationId: feature.locationId,
      },
    });
  });

  return {
    line,
    locationId: feature.locationId,
    creatureName: creature.name ?? "Місцевий",
    recoveredTwigs: recovered,
  };
}

export async function firstStrangeTotemFeatureIdAtPlayerLocation(playerId: number, query = "") {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return null;
  const features = await prisma.locationFeature.findMany({
    where: { locationId: player.currentLocationId, isActive: true, type: "LANDMARK" },
    orderBy: { id: "asc" },
  });
  const normalized = query.trim().toLocaleLowerCase("uk-UA");
  const totems = features.filter(isStrangeTotemFeature);
  if (!normalized) return totems[0]?.id ?? null;
  return totems.find((feature) => {
    const data = featureData(feature.data);
    const aliases = Array.isArray(data.aliases) ? data.aliases.filter((value): value is string => typeof value === "string") : [];
    return [feature.name, feature.key, ...aliases]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase("uk-UA").includes(normalized) || normalized.includes(value.toLocaleLowerCase("uk-UA")));
  })?.id ?? null;
}
