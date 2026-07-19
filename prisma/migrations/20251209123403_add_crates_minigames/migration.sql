-- CreateTable
CREATE TABLE "Crate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crateType" TEXT NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Crate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrateReward" (
    "id" TEXT NOT NULL,
    "crateId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" TEXT NOT NULL,
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrateReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinigameScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" INTEGER,
    "time" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinigameScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Crate_userId_idx" ON "Crate"("userId");

-- CreateIndex
CREATE INDEX "Crate_opened_idx" ON "Crate"("opened");

-- CreateIndex
CREATE INDEX "Crate_crateType_idx" ON "Crate"("crateType");

-- CreateIndex
CREATE INDEX "CrateReward_crateId_idx" ON "CrateReward"("crateId");

-- CreateIndex
CREATE INDEX "MinigameScore_userId_idx" ON "MinigameScore"("userId");

-- CreateIndex
CREATE INDEX "MinigameScore_gameType_idx" ON "MinigameScore"("gameType");

-- CreateIndex
CREATE INDEX "MinigameScore_score_idx" ON "MinigameScore"("score");

-- CreateIndex
CREATE INDEX "MinigameScore_createdAt_idx" ON "MinigameScore"("createdAt");

-- AddForeignKey
ALTER TABLE "Crate" ADD CONSTRAINT "Crate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrateReward" ADD CONSTRAINT "CrateReward_crateId_fkey" FOREIGN KEY ("crateId") REFERENCES "Crate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinigameScore" ADD CONSTRAINT "MinigameScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
