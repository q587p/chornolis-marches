import crypto from "crypto";
import { prisma } from "../db";
import { getChatLog, publicChatLog } from "../services/chatLog";
import { getPublicEcologySignStats } from "../services/ecologyStats";
import { getStatusData } from "../services/status";

export type WorldDigest = {
  title: string;
  body: string;
  contentHash: string;
  sourceId: string;
};

const SAFE_EVENT_TITLES = new Map<string, string>([
  ["Animal starved", "десь на межі голод узяв своє"],
  ["Creature killed prey", "хижак наздогнав здобич"],
  ["Player killed animal", "людська рука теж втрутилася в лісову рівновагу"],
  ["Лисиці вивели лисенят", "лисиці не забули свої нори"],
  ["Вовки вивели вовченят", "вовчі сліди стали впевненішими"],
  ["Ресурси відновлюються", "ліс потроху повертає втрачене"],
  ["Погода змінилася", "небо над Порубіжжям знову змінило настрій"],
  ["Campfire ash nearly gone", "старий попіл майже зрівнявся із землею"],
]);

function digestHash(title: string, body: string) {
  return crypto.createHash("sha256").update(`${title}\n${body}`).digest("hex");
}

function digestSourceId(now = new Date()) {
  return now.toISOString().slice(0, 13);
}

function strongestAnimalPresence(rows: Array<{ name: string; alive: number }>) {
  const sorted = [...rows].sort((a, b) => b.alive - a.alive);
  return sorted[0]?.alive > 0 ? sorted[0].name : null;
}

function animalPressureLine(stats: Awaited<ReturnType<typeof getPublicEcologySignStats>>) {
  const dominant = strongestAnimalPresence(stats.speciesRows);
  const births =
    stats.recent.counters.rabbitBirths
    + stats.recent.counters.mouseBirths
    + stats.recent.counters.foxBirths
    + stats.recent.counters.wolfBirths;
  const kills = stats.recent.counters.predatorKills + stats.recent.counters.playerKills;

  if (births > kills && births >= 3) return "Звірі розійшлися ширше, ніж учора, і трава слухає їхні лапи уважніше.";
  if (kills > births && kills >= 2) return "Полювання знову торкнулося межі: десь здобич не дійшла до ранку.";
  if (dominant) return `Найчастіше в записах трапляється ${dominant}, але ліс не називає точних стежок.`;
  return "Звірі тримаються тихо; у книзі Канцелярії поки більше туману, ніж певності.";
}

function resourceLine(stats: Awaited<ReturnType<typeof getPublicEcologySignStats>>) {
  const overgrazed =
    stats.recent.counters.oldAgeDeaths
    + stats.recent.counters.starvationDeaths
    + stats.recent.counters.predatorKills
    + stats.recent.counters.playerKills;

  if (stats.totals.corpseAnimals >= Math.max(3, Math.floor(stats.totals.aliveAnimals / 3))) {
    return "Старі рештки поволі зникають у землі, і ліс бере своє назад.";
  }
  if (overgrazed > 0) return "У кількох місцинах земля стала уважнішою до кожного кроку.";
  return "Трава ще тримається, але Порубіжжя пам’ятає, де її торкали найчастіше.";
}

function voicesLine(chatTotal: number) {
  if (chatTotal >= 12) return "Голоси на межі не стихали: люди, істоти й знаки знову шукали одне одного.";
  if (chatTotal > 0) return "Кілька голосів пройшли крізь день, але не кожне слово годиться для широкої дошки.";
  return "Голоси сьогодні трималися ближче до диму й власних думок.";
}

function worldShapeLine(status: Awaited<ReturnType<typeof getStatusData>>) {
  if (status.databaseError) return "Канцелярія чує не всі книги, тому цей запис коротший, ніж мав би бути.";
  if (status.aliveAnimalsCount > status.animalCorpsesCount * 4) return "Живе ще переважає зникле, але рівновага не любить самовпевненості.";
  if (status.animalCorpsesCount > 0) return "Межа лишила по собі рештки, які не варто плутати з тишею.";
  return "Світ рухається рівно, без гучних зарубок на дошці Канцелярії.";
}

async function latestSafeEventSigns(limit = 2) {
  const events = await prisma.worldEvent.findMany({
    where: {
      title: { in: [...SAFE_EVENT_TITLES.keys()] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { title: true },
  });

  return [...new Set(events.map((event) => SAFE_EVENT_TITLES.get(event.title)).filter(Boolean))];
}

export async function buildWorldDigest(now = new Date()): Promise<WorldDigest> {
  const [status, ecology, chat, eventSigns] = await Promise.all([
    getStatusData(),
    getPublicEcologySignStats(),
    getChatLog({ mode: "time", window: 24, page: 0, perPage: 5 }).then(publicChatLog),
    latestSafeEventSigns(),
  ]);

  const title = "Запис із краю Чорнолісу";
  const bodyLines = [
    "🌘 Запис із краю Чорнолісу",
    "",
    animalPressureLine(ecology),
    resourceLine(ecology),
    voicesLine(chat.total),
    worldShapeLine(status),
    ...eventSigns.slice(0, 2).map((line) => `Ще одна зарубка: ${line}.`),
    "",
    "Тим, хто давно не виходив за межу, варто пам’ятати: стежки не чекають незмінними.",
  ];
  const body = bodyLines.join("\n");

  return {
    title,
    body,
    contentHash: digestHash(title, body),
    sourceId: digestSourceId(now),
  };
}
