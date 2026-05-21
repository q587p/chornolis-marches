-- Location features for landmarks, light sources, bridges, gates and local rest modifiers.

CREATE TYPE "LocationFeatureType" AS ENUM (
  'BORDER_MARKER',
  'MAGIC_CAMPFIRE',
  'BRIDGE',
  'GATE',
  'LANDMARK'
);

CREATE TABLE "LocationFeature" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "locationId" INTEGER NOT NULL,
  "type" "LocationFeatureType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "providesLight" BOOLEAN NOT NULL DEFAULT false,
  "restStaminaCapMultiplier" INTEGER,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LocationFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationFeature_key_key" ON "LocationFeature"("key");
CREATE INDEX "LocationFeature_locationId_idx" ON "LocationFeature"("locationId");

ALTER TABLE "LocationFeature"
ADD CONSTRAINT "LocationFeature_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "CellLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
