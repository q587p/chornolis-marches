-- AlterTable
ALTER TABLE "HeraldPublication"
ADD COLUMN "manuallyDeletedAt" TIMESTAMP(3),
ADD COLUMN "repostedAt" TIMESTAMP(3),
ADD COLUMN "repostTelegramMessageId" INTEGER,
ADD COLUMN "repostCount" INTEGER NOT NULL DEFAULT 0;
