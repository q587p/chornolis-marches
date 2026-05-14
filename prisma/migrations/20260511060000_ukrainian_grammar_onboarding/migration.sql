-- Ukrainian grammar and first-login onboarding.

CREATE TYPE "GrammaticalGender" AS ENUM ('MASCULINE', 'FEMININE', 'NEUTER', 'PLURAL');
CREATE TYPE "Animacy" AS ENUM ('ANIMATE', 'INANIMATE');
CREATE TYPE "PlayerPronoun" AS ENUM ('HE', 'SHE', 'THEY');

ALTER TABLE "Player"
  ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pronoun" "PlayerPronoun",
  ADD COLUMN "nameNominative" TEXT,
  ADD COLUMN "nameGenitive" TEXT,
  ADD COLUMN "nameDative" TEXT,
  ADD COLUMN "nameAccusative" TEXT,
  ADD COLUMN "nameInstrumental" TEXT,
  ADD COLUMN "nameLocative" TEXT,
  ADD COLUMN "nameVocative" TEXT,
  ADD COLUMN "grammaticalGender" "GrammaticalGender",
  ADD COLUMN "animacy" "Animacy" NOT NULL DEFAULT 'ANIMATE';

ALTER TABLE "CreatureSpecies"
  ADD COLUMN "nameGenitive" TEXT,
  ADD COLUMN "nameDative" TEXT,
  ADD COLUMN "nameAccusative" TEXT,
  ADD COLUMN "nameInstrumental" TEXT,
  ADD COLUMN "nameLocative" TEXT,
  ADD COLUMN "nameVocative" TEXT,
  ADD COLUMN "grammaticalGender" "GrammaticalGender" NOT NULL DEFAULT 'MASCULINE',
  ADD COLUMN "animacy" "Animacy" NOT NULL DEFAULT 'ANIMATE';

ALTER TABLE "Creature"
  ADD COLUMN "nameGenitive" TEXT,
  ADD COLUMN "nameDative" TEXT,
  ADD COLUMN "nameAccusative" TEXT,
  ADD COLUMN "nameInstrumental" TEXT,
  ADD COLUMN "nameLocative" TEXT,
  ADD COLUMN "nameVocative" TEXT;

-- Existing players should not be blocked by onboarding after deploy.
-- New players created by /start will start with onboardingComplete=false.
UPDATE "Player"
SET
  "onboardingComplete" = true,
  "nameNominative" = COALESCE("firstName", "username", 'мандрівник'),
  "nameGenitive" = COALESCE("firstName", "username", 'мандрівника'),
  "nameDative" = COALESCE("firstName", "username", 'мандрівнику'),
  "nameAccusative" = COALESCE("firstName", "username", 'мандрівника'),
  "nameInstrumental" = COALESCE("firstName", "username", 'мандрівником'),
  "nameLocative" = COALESCE("firstName", "username", 'мандрівнику'),
  "nameVocative" = COALESCE("firstName", "username", 'мандрівнику')
WHERE "onboardingComplete" = false;
