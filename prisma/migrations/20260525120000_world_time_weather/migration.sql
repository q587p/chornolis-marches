-- Add persistent world time, weather and moon simulation state.

CREATE TYPE "WeatherType" AS ENUM (
  'CLEAR',
  'CLOUDY',
  'FOG',
  'DRIZZLE',
  'RAIN',
  'STORM',
  'SNOW'
);

CREATE TABLE "WorldState" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "absoluteMinute" INTEGER NOT NULL DEFAULT 360,
  "lastAdvancedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "weather" "WeatherType" NOT NULL DEFAULT 'CLOUDY',
  "weatherIntensity" INTEGER NOT NULL DEFAULT 35,
  "weatherEndsAtMinute" INTEGER NOT NULL DEFAULT 720,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorldState_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorldState" (
  "id",
  "absoluteMinute",
  "lastAdvancedAt",
  "weather",
  "weatherIntensity",
  "weatherEndsAtMinute",
  "createdAt",
  "updatedAt"
) VALUES (
  1,
  360,
  CURRENT_TIMESTAMP,
  'CLOUDY',
  35,
  720,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
