-- KickPool: MatchPool, PoolEntry, MatchPrediction, AICommentary

CREATE TABLE "MatchPool" (
    "id" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "participant1" TEXT NOT NULL,
    "participant2" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER NOT NULL DEFAULT 20,
    "inviteCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "winnerUserId" TEXT,
    "settlementTxSig" TEXT,
    "merkleProof" TEXT,
    "finalScore1" INTEGER,
    "finalScore2" INTEGER,
    "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchPool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchPool_inviteCode_key" ON "MatchPool"("inviteCode");
CREATE INDEX "MatchPool_fixtureId_idx" ON "MatchPool"("fixtureId");
CREATE INDEX "MatchPool_status_idx" ON "MatchPool"("status");
CREATE INDEX "MatchPool_creatorId_idx" ON "MatchPool"("creatorId");
CREATE INDEX "MatchPool_inviteCode_idx" ON "MatchPool"("inviteCode");

CREATE TABLE "PoolEntry" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "entryFeePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predictedWinner" TEXT,
    "predictedScore1" INTEGER,
    "predictedScore2" INTEGER,
    "finalScore" DOUBLE PRECISION,
    "rank" INTEGER,
    "prizeWon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payoutTxSig" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoolEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PoolEntry_poolId_userId_key" ON "PoolEntry"("poolId", "userId");
CREATE INDEX "PoolEntry_poolId_idx" ON "PoolEntry"("poolId");
CREATE INDEX "PoolEntry_userId_idx" ON "PoolEntry"("userId");

CREATE TABLE "MatchPrediction" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchPrediction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchPrediction_poolId_idx" ON "MatchPrediction"("poolId");
CREATE INDEX "MatchPrediction_userId_idx" ON "MatchPrediction"("userId");

CREATE TABLE "AICommentary" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "commentary" TEXT NOT NULL,
    "oddsContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AICommentary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AICommentary_poolId_idx" ON "AICommentary"("poolId");
CREATE INDEX "AICommentary_createdAt_idx" ON "AICommentary"("createdAt");

ALTER TABLE "MatchPool" ADD CONSTRAINT "MatchPool_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PoolEntry" ADD CONSTRAINT "PoolEntry_poolId_fkey"
    FOREIGN KEY ("poolId") REFERENCES "MatchPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PoolEntry" ADD CONSTRAINT "PoolEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_poolId_fkey"
    FOREIGN KEY ("poolId") REFERENCES "MatchPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AICommentary" ADD CONSTRAINT "AICommentary_poolId_fkey"
    FOREIGN KEY ("poolId") REFERENCES "MatchPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
