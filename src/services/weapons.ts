import { prisma } from "../db";
import { requireLexiconEntry, type NameForms } from "../content/lexicon/worldLexicon";

export type WeaponKey = "knife" | "hunting_spear" | "sickle" | "hand_axe" | "short_sword";

export type WeaponDefinition = {
  key: WeaponKey;
  name: string;
  description: string;
  canFreshen: boolean;
  attackProfile: "knife" | "spear" | "axe" | "sickle" | "sword";
};

export const WEAPON_DEFINITIONS: Record<WeaponKey, WeaponDefinition> = {
  knife: {
    key: "knife",
    name: "простий ніж",
    description: "Простий робочий ніж: для різання, освіжування й останнього захисту, якщо стежка стане злою.",
    canFreshen: true,
    attackProfile: "knife",
  },
  hunting_spear: {
    key: "hunting_spear",
    name: "мисливський спис",
    description: "Довгий спис для полювання й тримання звіра на відстані.",
    canFreshen: false,
    attackProfile: "spear",
  },
  sickle: {
    key: "sickle",
    name: "серп",
    description: "Криве гостре знаряддя для трав, стебел і обережної роботи з тушею.",
    canFreshen: true,
    attackProfile: "sickle",
  },
  hand_axe: {
    key: "hand_axe",
    name: "мала сокира",
    description: "Невелика сокира для хмизу, кущів і грубої оборони.",
    canFreshen: true,
    attackProfile: "axe",
  },
  short_sword: {
    key: "short_sword",
    name: "короткий меч",
    description: "Коротке лезо для ближнього бою, ще рідкісне на межі Чорнолісу.",
    canFreshen: true,
    attackProfile: "sword",
  },
};

const WEAPON_KEYS = new Set(Object.keys(WEAPON_DEFINITIONS));

export function isWeaponResourceKey(key: string | null | undefined): key is WeaponKey {
  return Boolean(key && WEAPON_KEYS.has(key));
}

export function weaponDefinitionByKey(key: string | null | undefined) {
  return isWeaponResourceKey(key) ? WEAPON_DEFINITIONS[key] : null;
}

export function weaponName(key: string | null | undefined) {
  return weaponDefinitionByKey(key)?.name ?? null;
}

export function weaponForms(key: string | null | undefined): NameForms | null {
  if (!isWeaponResourceKey(key)) return null;
  return requireLexiconEntry(`resource.${key}`).forms;
}

export function canWeaponFreshen(key: string | null | undefined) {
  return Boolean(weaponDefinitionByKey(key)?.canFreshen);
}

async function ensureWeaponResourceType(key: WeaponKey) {
  const weapon = WEAPON_DEFINITIONS[key];
  return prisma.resourceType.upsert({
    where: { key },
    update: { name: weapon.name, description: weapon.description },
    create: { key, name: weapon.name, description: weapon.description },
  });
}

export async function getPlayerEquippedWeapon(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { equippedWeaponKey: true },
  });
  const key = player?.equippedWeaponKey ?? null;
  const definition = weaponDefinitionByKey(key);
  return definition ? { ...definition, forms: weaponForms(definition.key)! } : null;
}

export async function getCreatureEquippedWeapon(creatureId: number) {
  const creature = await prisma.creature.findUnique({
    where: { id: creatureId },
    select: { equippedWeaponKey: true },
  });
  const key = creature?.equippedWeaponKey ?? null;
  const definition = weaponDefinitionByKey(key);
  return definition ? { ...definition, forms: weaponForms(definition.key)! } : null;
}

export async function equipPlayerWeapon(playerId: number, resourceKey: string) {
  if (!isWeaponResourceKey(resourceKey)) throw new Error("Це не схоже на зброю чи знаряддя для руки.");
  const resourceType = await ensureWeaponResourceType(resourceKey);
  const carried = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
  });
  if (!carried || carried.amount <= 0) throw new Error("У ваших речах немає цього знаряддя.");

  await prisma.player.update({ where: { id: playerId }, data: { equippedWeaponKey: resourceKey } });
  return WEAPON_DEFINITIONS[resourceKey];
}

export async function unequipPlayerWeapon(playerId: number, resourceKey?: string | null) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { equippedWeaponKey: true } });
  if (!player?.equippedWeaponKey) return null;
  if (resourceKey && player.equippedWeaponKey !== resourceKey) throw new Error("У руці зараз інше знаряддя.");
  await prisma.player.update({ where: { id: playerId }, data: { equippedWeaponKey: null } });
  return weaponDefinitionByKey(player.equippedWeaponKey);
}

export async function clearEquippedWeaponIfDropped(playerId: number, resourceKey: string) {
  if (!isWeaponResourceKey(resourceKey)) return false;
  const result = await prisma.player.updateMany({
    where: { id: playerId, equippedWeaponKey: resourceKey },
    data: { equippedWeaponKey: null },
  });
  return result.count > 0;
}

export async function grantStarterKnifeIfMissing(playerId: number) {
  const knife = await ensureWeaponResourceType("knife");
  await prisma.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: knife.id } },
    update: {},
    create: { playerId, resourceTypeId: knife.id, amount: 1 },
  });
}

export function heldWeaponLine(key: string | null | undefined) {
  const forms = weaponForms(key);
  return forms ? `Тримає ${forms.accusative}.` : null;
}

export function ownHeldWeaponLine(key: string | null | undefined) {
  const forms = weaponForms(key);
  return forms ? `У руці: ${forms.nominative}.` : "У руці: нічого для бою.";
}

export function freshenWeaponFailureText(key: string | null | undefined) {
  const weapon = weaponDefinitionByKey(key);
  if (!weapon) return "Для освіжування потрібен ніж або інше гостре знаряддя в руці.";
  const forms = weaponForms(weapon.key);
  return `${capitalizeFirst(forms?.nominative ?? weapon.name)} не підходить для чистого освіжування. Потрібне гостре лезо ближче до руки.`;
}

export function playerAttackKillText(key: string | null | undefined, targetAccusative: string) {
  const weapon = weaponDefinitionByKey(key);
  if (!weapon) return `⚔️ Ви збиваєте ${targetAccusative} ногою. Труп лишився на землі.`;
  if (weapon.attackProfile === "spear") return `⚔️ Ви виставляєте спис і пробиваєте коротким ударом. Здобич падає.`;
  if (weapon.attackProfile === "axe") return `⚔️ Ви б’єте малою сокирою. ${capitalizeFirst(targetAccusative)} падає, і труп лишається на землі.`;
  if (weapon.attackProfile === "sickle") return `⚔️ Ви ріжете серпом коротко й близько. ${capitalizeFirst(targetAccusative)} падає, і труп лишається на землі.`;
  if (weapon.attackProfile === "sword") return `⚔️ Ви б’єте коротким мечем. ${capitalizeFirst(targetAccusative)} падає, і труп лишається на землі.`;
  return `⚔️ Ви рвучко б’єте ножем. ${capitalizeFirst(targetAccusative)} падає, і труп лишається на землі.`;
}

export function playerAttackObserverText(key: string | null | undefined, targetAccusative: string) {
  const weapon = weaponDefinitionByKey(key);
  if (!weapon) return `Хтось збиває ${targetAccusative} ногою. Труп лишається на землі.`;
  const forms = weaponForms(weapon.key);
  if (weapon.attackProfile === "spear") return `Хтось виставляє ${forms?.accusative ?? weapon.name} і збиває ${targetAccusative}. Здобич падає.`;
  return `Хтось збиває ${targetAccusative} ${forms?.instrumental ?? weapon.name}. Труп лишається на землі.`;
}

export function creatureAttackObserverText(actorName: string, key: string | null | undefined, targetAccusative: string) {
  const weapon = weaponDefinitionByKey(key);
  if (!weapon) return null;
  const forms = weaponForms(weapon.key);
  if (weapon.attackProfile === "spear") return `${actorName} виставляє ${forms?.accusative ?? weapon.name} і збиває ${targetAccusative}, тоді підбирає здобич для падального рову.`;
  return `${actorName} збиває ${targetAccusative} ${forms?.instrumental ?? weapon.name}, тоді підбирає здобич для падального рову.`;
}

function capitalizeFirst(text: string) {
  return text ? text.charAt(0).toLocaleUpperCase("uk-UA") + text.slice(1) : text;
}
