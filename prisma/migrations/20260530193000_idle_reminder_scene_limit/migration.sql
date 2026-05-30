ALTER TABLE "Player"
  ADD COLUMN "idleReminderSceneKey" TEXT,
  ADD COLUMN "idleReminderCountForCurrentScene" INTEGER NOT NULL DEFAULT 0;
