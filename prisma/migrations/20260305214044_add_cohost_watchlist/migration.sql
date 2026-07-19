-- AlterTable
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "coHostIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unlockedBadges" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unlockedThemes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "tmdbType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "poster" TEXT,
    "year" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Watchlist_tmdbType_idx" ON "Watchlist"("tmdbType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Watchlist_userId_tmdbId_tmdbType_key" ON "Watchlist"("userId", "tmdbId", "tmdbType");

-- AddForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT IF EXISTS "Watchlist_userId_fkey";
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
