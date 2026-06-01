ALTER TABLE "Player"
  ADD COLUMN "sessionPresenceReason" TEXT,
  ADD COLUMN "sessionPresenceChangedAt" TIMESTAMP(3);
