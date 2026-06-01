ALTER TABLE "HeraldPublication"
ADD COLUMN "archiveOrder" INTEGER;

CREATE INDEX "HeraldPublication_sourceType_archiveOrder_idx" ON "HeraldPublication"("sourceType", "archiveOrder");
