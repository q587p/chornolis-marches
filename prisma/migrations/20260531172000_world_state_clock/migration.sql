CREATE TABLE "WorldState" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "absoluteMinute" INTEGER NOT NULL DEFAULT 185340,
  "lastAdvancedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "weatherKey" TEXT NOT NULL DEFAULT 'cloudy',
  "weatherIntensity" INTEGER NOT NULL DEFAULT 35,
  "weatherEndsAtMinute" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorldState_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorldState" ("id", "absoluteMinute", "lastAdvancedAt", "weatherKey", "weatherIntensity")
VALUES (1, 185340, CURRENT_TIMESTAMP, 'cloudy', 35)
ON CONFLICT ("id") DO NOTHING;
