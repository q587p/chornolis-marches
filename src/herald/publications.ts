import { prisma } from "../db";

type QueueHeraldPublicationInput = {
  sourceType: string;
  sourceId?: string;
  title: string;
  body: string;
  priority?: number;
  visibility?: string;
  availableAt?: Date;
  contentHash?: string;
};

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export async function findExistingPublicationByHash(hash: string) {
  return prisma.heraldPublication.findUnique({ where: { contentHash: hash } });
}

export async function queueHeraldPublication(input: QueueHeraldPublicationInput) {
  if (input.contentHash) {
    const existing = await findExistingPublicationByHash(input.contentHash);
    if (existing) return existing;
  }

  try {
    return await prisma.heraldPublication.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        title: input.title,
        body: input.body,
        priority: input.priority ?? 0,
        visibility: input.visibility ?? "PUBLIC",
        availableAt: input.availableAt,
        contentHash: input.contentHash,
      },
    });
  } catch (error) {
    if (input.contentHash && isUniqueConstraintError(error)) {
      const existing = await findExistingPublicationByHash(input.contentHash);
      if (existing) return existing;
    }

    throw error;
  }
}

export async function markPublicationPublished(id: number, telegramMessageId?: number) {
  return prisma.heraldPublication.update({
    where: { id },
    data: {
      publishedAt: new Date(),
      telegramMessageId,
      error: null,
    },
  });
}

export async function markPublicationFailed(id: number, error: string) {
  return prisma.heraldPublication.update({
    where: { id },
    data: {
      attempts: { increment: 1 },
      error: error.slice(0, 1000),
    },
  });
}

export async function getPendingPublications(limit: number) {
  return prisma.heraldPublication.findMany({
    where: {
      publishedAt: null,
      availableAt: { lte: new Date() },
      visibility: "PUBLIC",
    },
    orderBy: [
      { priority: "desc" },
      { availableAt: "asc" },
      { id: "asc" },
    ],
    take: Math.max(1, Math.min(100, Math.floor(limit))),
  });
}
