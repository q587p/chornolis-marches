import { prisma } from "../db";

export const HERALD_NEWS_SOURCE_TYPES = ["NEWS_MD", "NEWS_MD_ARCHIVE"] as const;

type QueueHeraldPublicationInput = {
  sourceType: string;
  sourceId?: string;
  sourceDate?: string;
  sourceVersion?: string;
  title: string;
  body: string;
  renderedText?: string;
  archiveOrder?: number;
  priority?: number;
  visibility?: string;
  availableAt?: Date;
  contentHash?: string;
};

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

function semanticVersionParts(value?: string | null) {
  if (!value) return null;
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length < 2 || parts.some((part) => !Number.isInteger(part) || part < 0)) return null;
  return parts;
}

function compareSemanticVersions(left?: string | null, right?: string | null) {
  const leftParts = semanticVersionParts(left);
  const rightParts = semanticVersionParts(right);
  if (!leftParts || !rightParts) return null;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function sortArchivePublications<T extends {
  id: number;
  archiveOrder: number | null;
  sourceDate: string | null;
  sourceVersion: string | null;
  availableAt: Date;
}>(publications: T[]) {
  return [...publications].sort((left, right) => {
    if (left.archiveOrder !== null && right.archiveOrder !== null && left.archiveOrder !== right.archiveOrder) {
      return left.archiveOrder - right.archiveOrder;
    }
    if (left.archiveOrder !== null && right.archiveOrder === null) return -1;
    if (left.archiveOrder === null && right.archiveOrder !== null) return 1;
    if (left.sourceDate && right.sourceDate && left.sourceDate !== right.sourceDate) {
      return left.sourceDate.localeCompare(right.sourceDate);
    }

    const versionCompare = compareSemanticVersions(left.sourceVersion, right.sourceVersion);
    if (versionCompare !== null && versionCompare !== 0) return versionCompare;

    return left.availableAt.getTime() - right.availableAt.getTime() || left.id - right.id;
  });
}

export function publicationErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/\b\d+:[A-Za-z0-9_-]{20,}\b/g, "[redacted-token]")
    .replace(/(bot|token|secret|password|authorization)=([^&\s]+)/gi, "$1=[redacted]")
    .slice(0, 1000);
}

export async function findExistingPublicationByHash(hash: string) {
  return prisma.heraldPublication.findUnique({ where: { contentHash: hash } });
}

export async function getHeraldPublicationById(id: number) {
  return prisma.heraldPublication.findUnique({ where: { id } });
}

export async function listRecentHeraldPublications(limit: number) {
  return prisma.heraldPublication.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(1, Math.min(50, Math.floor(limit))),
  });
}

export async function getPublicationQueueControl() {
  return prisma.heraldPublicationQueueControl.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function setPublicationQueuePaused(isPaused: boolean) {
  return prisma.heraldPublicationQueueControl.upsert({
    where: { id: 1 },
    create: { id: 1, isPaused },
    update: { isPaused },
  });
}

export async function isPublicationQueuePaused() {
  return (await getPublicationQueueControl()).isPaused;
}

export async function findExistingPublicationsByHashes(hashes: readonly string[]) {
  const uniqueHashes = [...new Set(hashes.filter(Boolean))];
  if (!uniqueHashes.length) return [];

  return prisma.heraldPublication.findMany({
    where: { contentHash: { in: uniqueHashes } },
  });
}

export async function queueHeraldPublication(input: QueueHeraldPublicationInput) {
  if (input.contentHash) {
    const existing = await findExistingPublicationByHash(input.contentHash);
    if (existing) {
      const missingSnapshot =
        (input.sourceDate && !existing.sourceDate) ||
        (input.sourceVersion && !existing.sourceVersion) ||
        (input.renderedText && !existing.renderedText) ||
        (input.archiveOrder !== undefined && existing.archiveOrder === null);

      if (missingSnapshot) {
        return prisma.heraldPublication.update({
          where: { id: existing.id },
          data: {
            sourceDate: existing.sourceDate ?? input.sourceDate,
            sourceVersion: existing.sourceVersion ?? input.sourceVersion,
            renderedText: existing.renderedText ?? input.renderedText,
            archiveOrder: existing.archiveOrder ?? input.archiveOrder,
          },
        });
      }

      return existing;
    }
  }

  try {
    return await prisma.heraldPublication.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceDate: input.sourceDate,
        sourceVersion: input.sourceVersion,
        title: input.title,
        body: input.body,
        renderedText: input.renderedText,
        archiveOrder: input.archiveOrder,
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

export async function prepareManualHeraldPublication(input: QueueHeraldPublicationInput) {
  if (input.contentHash) {
    const existing = await findExistingPublicationByHash(input.contentHash);
    if (existing) {
      if (existing.publishedAt) {
        const missingSourceMetadata =
          (input.sourceDate && !existing.sourceDate) ||
          (input.sourceVersion && !existing.sourceVersion) ||
          (input.archiveOrder !== undefined && existing.archiveOrder === null);
        if (missingSourceMetadata) {
          return prisma.heraldPublication.update({
            where: { id: existing.id },
            data: {
              sourceDate: existing.sourceDate ?? input.sourceDate,
              sourceVersion: existing.sourceVersion ?? input.sourceVersion,
              archiveOrder: existing.archiveOrder ?? input.archiveOrder,
            },
          });
        }
        return existing;
      }

      return prisma.heraldPublication.update({
        where: { id: existing.id },
        data: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          sourceDate: input.sourceDate,
          sourceVersion: input.sourceVersion,
          title: input.title,
          body: input.body,
          renderedText: input.renderedText,
          archiveOrder: input.archiveOrder,
          priority: input.priority ?? existing.priority,
          visibility: input.visibility ?? "PUBLIC",
          availableAt: input.availableAt ?? new Date(),
          error: null,
        },
      });
    }
  }

  return queueHeraldPublication(input);
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

export async function markPublicationReposted(id: number, telegramMessageId: number) {
  return prisma.heraldPublication.update({
    where: { id },
    data: {
      repostedAt: new Date(),
      repostTelegramMessageId: telegramMessageId,
      repostCount: { increment: 1 },
      error: null,
    },
  });
}

export async function markPublicationManuallyDeleted(id: number) {
  return prisma.heraldPublication.update({
    where: { id },
    data: {
      manuallyDeletedAt: new Date(),
    },
  });
}

export async function markPublicationFailed(id: number, error: unknown) {
  return prisma.heraldPublication.update({
    where: { id },
    data: {
      attempts: { increment: 1 },
      error: publicationErrorMessage(error),
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
      { availableAt: "asc" },
      { archiveOrder: "asc" },
      { id: "asc" },
    ],
    take: Math.max(1, Math.min(100, Math.floor(limit))),
  });
}

export async function countPendingPublications(sourceTypes?: readonly string[]) {
  return prisma.heraldPublication.count({
    where: {
      publishedAt: null,
      visibility: "PUBLIC",
      ...(sourceTypes?.length ? { sourceType: { in: [...sourceTypes] } } : {}),
    },
  });
}

export async function cancelPendingPublications(sourceTypes: readonly string[] = HERALD_NEWS_SOURCE_TYPES) {
  return prisma.heraldPublication.updateMany({
    where: {
      publishedAt: null,
      visibility: "PUBLIC",
      sourceType: { in: [...sourceTypes] },
    },
    data: {
      visibility: "CANCELED",
      error: null,
    },
  });
}

export async function listPendingArchivePublications(sourceType = "NEWS_MD_ARCHIVE") {
  const rows = await prisma.heraldPublication.findMany({
    where: {
      sourceType,
      publishedAt: null,
      visibility: "PUBLIC",
    },
    orderBy: [
      { archiveOrder: "asc" },
      { availableAt: "asc" },
      { id: "asc" },
    ],
  });
  return sortArchivePublications(rows);
}

export async function listOverdueArchivePublications(now = new Date(), sourceType = "NEWS_MD_ARCHIVE") {
  const rows = await prisma.heraldPublication.findMany({
    where: {
      sourceType,
      publishedAt: null,
      visibility: "PUBLIC",
      availableAt: { lte: now },
    },
    orderBy: [
      { archiveOrder: "asc" },
      { availableAt: "asc" },
      { id: "asc" },
    ],
  });
  return sortArchivePublications(rows);
}

export async function countArchivePublications(sourceType = "NEWS_MD_ARCHIVE") {
  const [pending, published] = await Promise.all([
    prisma.heraldPublication.count({ where: { sourceType, publishedAt: null, visibility: "PUBLIC" } }),
    prisma.heraldPublication.count({ where: { sourceType, publishedAt: { not: null }, visibility: "PUBLIC" } }),
  ]);
  return { pending, published };
}

export async function reschedulePendingArchivePublications(
  intervalMs: number,
  now = new Date(),
  sourceType = "NEWS_MD_ARCHIVE",
) {
  const pending = await listPendingArchivePublications(sourceType);

  for (const [index, publication] of pending.entries()) {
    await prisma.heraldPublication.update({
      where: { id: publication.id },
      data: {
        availableAt: new Date(now.getTime() + index * intervalMs),
      },
    });
  }

  return {
    count: pending.length,
    nextAvailableAt: pending.length ? now : null,
    first: pending[0] ?? null,
  };
}

export async function rebalanceOverdueArchivePublications(
  intervalMs: number,
  now = new Date(),
  sourceType = "NEWS_MD_ARCHIVE",
) {
  const overdue = await listOverdueArchivePublications(now, sourceType);
  const [, ...toMove] = overdue;

  for (const [index, publication] of toMove.entries()) {
    await prisma.heraldPublication.update({
      where: { id: publication.id },
      data: {
        availableAt: new Date(now.getTime() + (index + 1) * intervalMs),
      },
    });
  }

  return {
    keptDue: overdue[0] ?? null,
    moved: toMove.length,
    nextAvailableAt: toMove.length ? new Date(now.getTime() + intervalMs) : null,
  };
}
