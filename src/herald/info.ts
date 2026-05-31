import type { CellLocation, Player, Region } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA, PLAYER_HUNGER_MAX } from "../gameConfig";
import { formatHungerState, formatLifeState, formatResourceState } from "../utils/playerText";
import { heraldGatheringLine, heraldPracticePhrase, heraldTrailPhrase } from "./infoThresholds";

type HeraldInfoPlayer = Player & {
  currentLocation: (CellLocation & { region: Region }) | null;
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("uk-UA") ?? "";
}

function displayName(player: Pick<HeraldInfoPlayer, "nameNominative" | "firstName" | "username">) {
  return player.nameNominative ?? player.firstName ?? player.username ?? "мандрівник";
}

function gatheringLine(player: HeraldInfoPlayer) {
  const gathered = player.berriesGathered + player.mushroomsGathered + player.herbsGathered;
  return heraldGatheringLine(player.gatherAttempts, gathered);
}

function resourceLine(player: HeraldInfoPlayer) {
  const parts = [
    player.berriesGathered > 0 ? "ягоди" : "",
    player.mushroomsGathered > 0 ? "гриби" : "",
    player.herbsGathered > 0 ? "лікарські трави" : "",
  ].filter(Boolean);
  if (!parts.length) return "";
  return `У записах уже трапляються: ${parts.join(", ")}.`;
}

function socialLine(player: HeraldInfoPlayer) {
  const socialWeight = player.greetings + player.says;
  if (socialWeight <= 0) return "Голоси й жести: тиша або майже тиша.";
  if (socialWeight < 10) return "Голоси й жести: кілька зарубок на полях книги.";
  if (socialWeight < 50) return "Голоси й жести: це ім’я вже помічали поруч із чужими словами.";
  return "Голоси й жести: Канцелярія часто бачить це ім’я там, де хтось озивається.";
}

function restLine(player: HeraldInfoPlayer) {
  if (player.restStarts <= 0) return "Відпочинок: записів майже немає.";
  if (player.restFullRecoveries > 0) return "Відпочинок: були миті, коли снага поверталася до краю.";
  return "Відпочинок: зупинки були, але повне відновлення в книзі трапляється рідко.";
}

function conditionLine(player: HeraldInfoPlayer) {
  const life = formatLifeState(player.hp, player.hpMax ?? BASE_HP).toLocaleLowerCase("uk-UA");
  const stamina = formatResourceState(player.stamina, player.staminaMax ?? BASE_STAMINA).toLocaleLowerCase("uk-UA");
  const hunger = formatHungerState(player.hunger, PLAYER_HUNGER_MAX)
    .replace(/^Ви\s+/u, "")
    .replace(/\.$/u, "")
    .toLocaleLowerCase("uk-UA");
  return `Стан на полях: життя — ${life}; снага — ${stamina}; ${hunger}.`;
}

function locationLine(player: HeraldInfoPlayer) {
  if (!player.currentLocation) return "Поточна місцина в книзі не позначена.";
  return `Остання позначка: ${player.currentLocation.region.name} / ${player.currentLocation.name}.`;
}

function candidateMatches(player: HeraldInfoPlayer, query: string) {
  const normalized = normalize(query);
  const values = [
    player.nameNominative,
    player.nameGenitive,
    player.username,
    player.firstName,
    player.lastName,
  ].map(normalize).filter(Boolean);
  return values.some((value) => value === normalized || value.includes(normalized));
}

export async function findPlayerForHeraldInfo(query: string, requesterTelegramId?: number | string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.toLocaleLowerCase("uk-UA") === "me") {
    if (requesterTelegramId === undefined) return null;
    return prisma.player.findUnique({
      where: { telegramId: String(requesterTelegramId) },
      include: { currentLocation: { include: { region: true } } },
    });
  }

  const id = Number(trimmed);
  if (Number.isInteger(id) && id > 0) {
    return prisma.player.findUnique({
      where: { id },
      include: { currentLocation: { include: { region: true } } },
    });
  }

  const candidates = await prisma.player.findMany({
    where: {
      OR: [
        { nameNominative: { not: null } },
        { username: { not: null } },
        { firstName: { not: null } },
      ],
    },
    include: { currentLocation: { include: { region: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 200,
  });

  return candidates.find((player) => candidateMatches(player, trimmed)) ?? null;
}

export function renderHeraldPlayerInfo(player: HeraldInfoPlayer) {
  const name = displayName(player);
  const resourceText = resourceLine(player);
  return [
    `📖 Особовий запис Канцелярії: ${name}`,
    "",
    `Шлях: ${heraldTrailPhrase(player.steps)}.`,
    gatheringLine(player),
    resourceText,
    socialLine(player),
    restLine(player),
    heraldPracticePhrase(player.animalsKilled, "Полювання"),
    locationLine(player),
    conditionLine(player),
    "",
    "Канцелярія не зважує людей рівнями. Вона лише береже сліди, які вже лишилися на межі.",
  ].filter(Boolean).join("\n");
}

export function renderHeraldInfoMissing(query: string) {
  const suffix = query.trim() ? ` за печаткою «${query.trim()}»` : "";
  return `Канцелярія переглянула книги${suffix}, але не знайшла певного особового запису.`;
}

export function renderHeraldInfoPrivateNotice() {
  return "Канцелярія береже особові записи за впізнаною печаткою. Для цього наказу потрібна службова печатка.";
}
