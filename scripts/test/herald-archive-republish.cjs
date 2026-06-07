const assert = require("node:assert/strict");

require("ts-node/register");

const { formatHeraldPublicationMessage } = require("../../src/herald/format");
const {
  archiveRepublishContentHash,
  cancelArchiveRepublishPendingPublications,
  DEFAULT_ARCHIVE_REPUBLISH_INTERVAL_MS,
  NEWS_ARCHIVE_REPUBLISH_SOURCE_TYPE,
  previewArchiveRepublish,
  queueArchiveRepublish,
} = require("../../src/herald/newsBackfill");
const { parseNewsEntries } = require("../../src/herald/newsMarkdown");

function archiveEntries() {
  return parseNewsEntries([
    "## 0.4.2 -- Third -- 12026-05-03",
    "",
    "Third body.",
    "",
    "## 0.4.0 -- First -- 12026-05-01",
    "",
    "First body.",
    "",
    "## 0.4.3 -- Fourth -- 12026-05-04",
    "",
    "Fourth body.",
    "",
    "## 0.4.1 -- Second -- 12026-05-02",
    "",
    "Second body.",
  ].join("\n"));
}

function createPublicationStore(seed = []) {
  const rows = seed.map((row, index) => ({
    id: row.id ?? index + 1,
    sourceType: row.sourceType,
    sourceId: row.sourceId ?? row.title,
    sourceDate: row.sourceDate ?? null,
    sourceVersion: row.sourceVersion ?? null,
    title: row.title,
    body: row.body ?? "",
    renderedText: row.renderedText ?? null,
    archiveOrder: row.archiveOrder ?? null,
    priority: row.priority ?? 0,
    visibility: row.visibility ?? "PUBLIC",
    availableAt: row.availableAt ?? new Date("2026-06-07T10:00:00.000Z"),
    publishedAt: row.publishedAt ?? null,
    contentHash: row.contentHash ?? null,
    error: row.error ?? null,
  }));
  let nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

  return {
    rows,
    store: {
      async findExistingPublicationsByHashes(hashes) {
        return rows.filter((row) => row.contentHash && hashes.includes(row.contentHash));
      },
      async prepareManualHeraldPublication(input) {
        const existing = input.contentHash
          ? rows.find((row) => row.contentHash === input.contentHash)
          : null;

        if (existing?.publishedAt) return existing;

        if (existing) {
          Object.assign(existing, {
            sourceType: input.sourceType,
            sourceId: input.sourceId ?? null,
            sourceDate: input.sourceDate ?? null,
            sourceVersion: input.sourceVersion ?? null,
            title: input.title,
            body: input.body,
            renderedText: input.renderedText ?? null,
            archiveOrder: input.archiveOrder ?? null,
            priority: input.priority ?? existing.priority,
            visibility: input.visibility ?? "PUBLIC",
            availableAt: input.availableAt ?? existing.availableAt,
            error: null,
          });
          return existing;
        }

        const created = {
          id: nextId,
          sourceType: input.sourceType,
          sourceId: input.sourceId ?? null,
          sourceDate: input.sourceDate ?? null,
          sourceVersion: input.sourceVersion ?? null,
          title: input.title,
          body: input.body,
          renderedText: input.renderedText ?? null,
          archiveOrder: input.archiveOrder ?? null,
          priority: input.priority ?? 0,
          visibility: input.visibility ?? "PUBLIC",
          availableAt: input.availableAt ?? new Date(),
          publishedAt: null,
          contentHash: input.contentHash ?? null,
          error: null,
        };
        nextId += 1;
        rows.push(created);
        return created;
      },
      async countArchivePublications(sourceType) {
        return {
          pending: rows.filter((row) => row.sourceType === sourceType && !row.publishedAt && row.visibility === "PUBLIC").length,
          published: rows.filter((row) => row.sourceType === sourceType && row.publishedAt && row.visibility === "PUBLIC").length,
        };
      },
      async listPendingArchivePublications(sourceType) {
        return rows
          .filter((row) => row.sourceType === sourceType && !row.publishedAt && row.visibility === "PUBLIC")
          .sort((left, right) => (
            (left.archiveOrder ?? Number.MAX_SAFE_INTEGER) - (right.archiveOrder ?? Number.MAX_SAFE_INTEGER) ||
            left.availableAt.getTime() - right.availableAt.getTime() ||
            left.id - right.id
          ));
      },
      async cancelPendingPublications(sourceTypes) {
        let count = 0;
        for (const row of rows) {
          if (!sourceTypes.includes(row.sourceType) || row.publishedAt || row.visibility !== "PUBLIC") continue;
          row.visibility = "CANCELED";
          row.error = null;
          count += 1;
        }
        return { count };
      },
    },
  };
}

function republishSeed(entry, status, id) {
  return {
    id,
    sourceType: NEWS_ARCHIVE_REPUBLISH_SOURCE_TYPE,
    sourceId: entry.title,
    title: entry.title,
    body: entry.body,
    archiveOrder: Number(entry.sourceVersion?.split(".").at(-1) ?? 0),
    visibility: status === "canceled" ? "CANCELED" : "PUBLIC",
    publishedAt: status === "published" ? new Date("2026-06-07T11:00:00.000Z") : null,
    contentHash: archiveRepublishContentHash(entry.contentHash),
  };
}

const entries = archiveEntries();
const orderedTitles = entries.slice().sort((left, right) => left.sourceVersion.localeCompare(right.sourceVersion)).map((entry) => entry.title);
assert.deepEqual(orderedTitles, [
  "0.4.0 -- First -- 12026-05-01",
  "0.4.1 -- Second -- 12026-05-02",
  "0.4.2 -- Third -- 12026-05-03",
  "0.4.3 -- Fourth -- 12026-05-04",
]);

async function run() {
  {
    const { store } = createPublicationStore([
      republishSeed(entries[1], "pending", 101),
      republishSeed(entries[3], "published", 102),
      republishSeed(entries[0], "canceled", 103),
    ]);
    const now = new Date("2026-06-07T12:00:00.000Z");
    const intervalMs = 15 * 60 * 1000;
    const preview = await previewArchiveRepublish(entries, intervalMs, now, store);

    assert.equal(preview.total, 4);
    assert.equal(preview.first.title, "0.4.0 -- First -- 12026-05-01");
    assert.equal(preview.last.title, "0.4.3 -- Fourth -- 12026-05-04");
    assert.equal(preview.intervalMs, intervalMs);
    assert.equal(preview.estimatedFinishAt.toISOString(), "2026-06-07T12:45:00.000Z");
    assert.equal(preview.pending, 1);
    assert.equal(preview.published, 1);
    assert.equal(preview.canceled, 1);
    assert.equal(preview.missing, 1);
    assert.equal(preview.alreadyQueued, true);
  }

  {
    const { rows, store } = createPublicationStore();
    const now = new Date("2026-06-07T12:00:00.000Z");
    const intervalMs = 10 * 60 * 1000;
    const result = await queueArchiveRepublish(entries, intervalMs, now, store);

    assert.equal(result.alreadyQueued, false);
    assert.equal(result.queued.length, 4);
    assert.deepEqual(result.queued.map((row) => row.title), orderedTitles);
    assert.deepEqual(result.queued.map((row) => row.sourceType), Array(4).fill(NEWS_ARCHIVE_REPUBLISH_SOURCE_TYPE));
    assert.deepEqual(result.queued.map((row) => row.archiveOrder), [0, 1, 2, 3]);
    assert.deepEqual(result.queued.map((row) => row.availableAt.toISOString()), [
      "2026-06-07T12:00:00.000Z",
      "2026-06-07T12:10:00.000Z",
      "2026-06-07T12:20:00.000Z",
      "2026-06-07T12:30:00.000Z",
    ]);
    assert.deepEqual(result.queued.map((row) => row.contentHash), result.queued.map((row) => archiveRepublishContentHash(
      entries.find((entry) => entry.title === row.title).contentHash,
    )));
    assert.equal(rows.length, 4);

    const second = await queueArchiveRepublish(entries, intervalMs, now, store);
    assert.equal(second.alreadyQueued, true);
    assert.equal(second.queued.length, 0);
    assert.equal(second.pending, 4);
    assert.equal(rows.length, 4);
  }

  {
    const firstEntry = entries.find((entry) => entry.sourceVersion === "0.4.0");
    const { rows, store } = createPublicationStore([republishSeed(firstEntry, "published", 201)]);
    const result = await queueArchiveRepublish(entries, DEFAULT_ARCHIVE_REPUBLISH_INTERVAL_MS, new Date("2026-06-07T12:00:00.000Z"), store);

    assert.equal(result.skipped, 1);
    assert.equal(result.queued.length, 3);
    assert.doesNotMatch(result.queued.map((row) => row.title).join("\n"), /0\.4\.0 -- First/);
    assert.equal(rows.filter((row) => row.contentHash === archiveRepublishContentHash(firstEntry.contentHash)).length, 1);
  }

  {
    const firstEntry = entries.find((entry) => entry.sourceVersion === "0.4.0");
    const { rows, store } = createPublicationStore([republishSeed(firstEntry, "canceled", 301)]);
    const result = await queueArchiveRepublish([firstEntry], DEFAULT_ARCHIVE_REPUBLISH_INTERVAL_MS, new Date("2026-06-07T12:00:00.000Z"), store);

    assert.equal(result.queued.length, 1, "queueArchiveRepublish reactivates canceled unpublished republish rows");
    assert.equal(result.queued[0].id, 301);
    assert.equal(result.queued[0].visibility, "PUBLIC");
    assert.equal(rows.length, 1);
  }

  {
    const firstEntry = entries.find((entry) => entry.sourceVersion === "0.4.0");
    const { rows, store } = createPublicationStore([
      {
        id: 401,
        sourceType: "NEWS_MD",
        title: "Current news",
        contentHash: "current",
      },
      {
        id: 402,
        sourceType: "NEWS_MD_ARCHIVE",
        title: "Ordinary archive",
        contentHash: "archive",
      },
      republishSeed(firstEntry, "pending", 403),
      republishSeed(entries.find((entry) => entry.sourceVersion === "0.4.1"), "published", 404),
    ]);

    const canceled = await cancelArchiveRepublishPendingPublications(store);
    assert.equal(canceled.count, 1);
    assert.equal(rows.find((row) => row.id === 401).visibility, "PUBLIC");
    assert.equal(rows.find((row) => row.id === 402).visibility, "PUBLIC");
    assert.equal(rows.find((row) => row.id === 403).visibility, "CANCELED");
    assert.equal(rows.find((row) => row.id === 404).visibility, "PUBLIC");
  }

  {
    const formatted = formatHeraldPublicationMessage({
      sourceType: NEWS_ARCHIVE_REPUBLISH_SOURCE_TYPE,
      title: "0.4.0 -- First -- 12026-05-01",
      sourceDate: "12026-05-01",
      body: "First body.",
    });
    assert.match(formatted, /📜 З архіву Канцелярії/);
    assert.doesNotMatch(formatted, /Повторна публікація/);
    assert.doesNotMatch(formatted, /repost/i);
  }
}

run()
  .then(() => {
    console.log("Herald archive republish queue OK");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
