-- Admin reset, creature visibility and profession metadata.
-- `IF NOT EXISTS` keeps local/dev databases tolerant if this patch is re-applied.

ALTER TYPE "LocationFeatureType" ADD VALUE IF NOT EXISTS 'CAMPFIRE';
ALTER TYPE "CreatureActivity" ADD VALUE IF NOT EXISTS 'SLEEPING';

ALTER TABLE "Creature" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Creature" ADD COLUMN IF NOT EXISTS "professionKey" TEXT;
ALTER TABLE "Creature" ADD COLUMN IF NOT EXISTS "professionName" TEXT;
