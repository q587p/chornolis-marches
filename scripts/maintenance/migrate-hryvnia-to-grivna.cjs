const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const OLD_KEY = "hryvnia";
const NEW_KEY = "grivna";

const GRIVNA_RESOURCE = {
  key: NEW_KEY,
  name: "ґривня",
  description: "Більша грошова одиниця, важча й рідкісніша за шаг. У Порубіжжі її радше бережуть, ніж витрачають похапцем.",
};

function replaceOldMoneyKeys(value) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = replaceOldMoneyKeys(item);
      changed ||= result.changed;
      return result.value;
    });
    return { value: next, changed };
  }

  if (!value || typeof value !== "object") return { value, changed: false };

  let changed = false;
  const next = {};
  for (const [key, raw] of Object.entries(value)) {
    const result = replaceOldMoneyKeys(raw);
    const nextKey = key === OLD_KEY ? NEW_KEY : key;
    if (nextKey !== key) changed = true;

    if (Object.prototype.hasOwnProperty.call(next, nextKey)) {
      const left = Number(next[nextKey]);
      const right = Number(result.value);
      next[nextKey] = Number.isFinite(left) && Number.isFinite(right)
        ? Math.max(left, right)
        : result.value;
    } else {
      next[nextKey] = result.value;
    }
    changed ||= result.changed;
  }

  return { value: next, changed };
}

async function mergePlayerResources(oldType, newType) {
  const rows = await prisma.playerResource.findMany({ where: { resourceTypeId: oldType.id } });
  for (const row of rows) {
    await prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId: row.playerId, resourceTypeId: newType.id } },
      update: { amount: { increment: row.amount } },
      create: { playerId: row.playerId, resourceTypeId: newType.id, amount: row.amount },
    });
    await prisma.playerResource.delete({ where: { id: row.id } });
  }
  return rows.length;
}

async function mergeCreatureResources(oldType, newType) {
  const rows = await prisma.creatureResource.findMany({ where: { resourceTypeId: oldType.id } });
  for (const row of rows) {
    await prisma.creatureResource.upsert({
      where: { creatureId_resourceTypeId: { creatureId: row.creatureId, resourceTypeId: newType.id } },
      update: { amount: { increment: row.amount } },
      create: { creatureId: row.creatureId, resourceTypeId: newType.id, amount: row.amount },
    });
    await prisma.creatureResource.delete({ where: { id: row.id } });
  }
  return rows.length;
}

async function mergeResourceNodes(oldType, newType) {
  const rows = await prisma.resourceNode.findMany({ where: { resourceTypeId: oldType.id } });
  for (const row of rows) {
    const existing = await prisma.resourceNode.findUnique({
      where: { locationId_resourceTypeId: { locationId: row.locationId, resourceTypeId: newType.id } },
    });

    if (existing) {
      await prisma.resourceNode.update({
        where: { id: existing.id },
        data: {
          amount: existing.amount + row.amount,
          maxAmount: Math.max(existing.maxAmount, row.maxAmount),
        },
      });
      await prisma.resourceNode.delete({ where: { id: row.id } });
    } else {
      await prisma.resourceNode.update({
        where: { id: row.id },
        data: { resourceTypeId: newType.id },
      });
    }
  }
  return rows.length;
}

async function rewriteFeatureJson() {
  const features = await prisma.locationFeature.findMany({
    select: { id: true, data: true },
  });

  let changedCount = 0;
  for (const feature of features) {
    const result = replaceOldMoneyKeys(feature.data);
    if (!result.changed) continue;
    await prisma.locationFeature.update({
      where: { id: feature.id },
      data: { data: result.value },
    });
    changedCount += 1;
  }
  return changedCount;
}

async function main() {
  const newType = await prisma.resourceType.upsert({
    where: { key: NEW_KEY },
    update: {
      name: GRIVNA_RESOURCE.name,
      description: GRIVNA_RESOURCE.description,
    },
    create: GRIVNA_RESOURCE,
  });

  const oldType = await prisma.resourceType.findUnique({ where: { key: OLD_KEY } });
  const featuresChanged = await rewriteFeatureJson();
  const contributionsChanged = await prisma.carcassDropoffContribution.updateMany({
    where: { resourceTypeKey: OLD_KEY },
    data: { resourceTypeKey: NEW_KEY },
  });

  if (!oldType) {
    console.log(`No accidental ${OLD_KEY} resource type found. Feature JSON changed: ${featuresChanged}.`);
    return;
  }

  const playerRows = await mergePlayerResources(oldType, newType);
  const creatureRows = await mergeCreatureResources(oldType, newType);
  const nodeRows = await mergeResourceNodes(oldType, newType);

  const remaining = await Promise.all([
    prisma.playerResource.count({ where: { resourceTypeId: oldType.id } }),
    prisma.creatureResource.count({ where: { resourceTypeId: oldType.id } }),
    prisma.resourceNode.count({ where: { resourceTypeId: oldType.id } }),
  ]);

  if (remaining.every((count) => count === 0)) {
    await prisma.resourceType.delete({ where: { id: oldType.id } });
  }

  console.log([
    `Migrated accidental ${OLD_KEY} data into ${NEW_KEY}.`,
    `playerResources=${playerRows}`,
    `creatureResources=${creatureRows}`,
    `resourceNodes=${nodeRows}`,
    `featureJson=${featuresChanged}`,
    `contributions=${contributionsChanged.count}`,
  ].join(" "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
