CREATE TABLE "HeraldPublication" (
    "id" SERIAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "telegramMessageId" INTEGER,
    "contentHash" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeraldPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HeraldPublication_contentHash_key" ON "HeraldPublication"("contentHash");
CREATE INDEX "HeraldPublication_publishedAt_availableAt_priority_idx" ON "HeraldPublication"("publishedAt", "availableAt", "priority");
CREATE INDEX "HeraldPublication_sourceType_sourceId_idx" ON "HeraldPublication"("sourceType", "sourceId");
