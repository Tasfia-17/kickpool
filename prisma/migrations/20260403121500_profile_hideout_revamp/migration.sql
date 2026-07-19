-- AlterTable
ALTER TABLE "User"
ADD COLUMN "profileSceneEffect" TEXT,
ADD COLUMN "profileSceneId" TEXT;

-- CreateTable
CREATE TABLE "ProfileShowcaseSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemRef" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileShowcaseSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePassportStamp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT,
    "stampKey" TEXT NOT NULL,
    "stampType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "artVariant" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfilePassportStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomPersona" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT,
    "badgeEmoji" TEXT,
    "aboutMe" TEXT,
    "sceneId" TEXT,
    "profileEffect" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "avatarVariant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomPersona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileShowcaseSlot_userId_idx" ON "ProfileShowcaseSlot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileShowcaseSlot_userId_slotIndex_key" ON "ProfileShowcaseSlot"("userId", "slotIndex");

-- CreateIndex
CREATE INDEX "ProfilePassportStamp_userId_earnedAt_idx" ON "ProfilePassportStamp"("userId", "earnedAt");

-- CreateIndex
CREATE INDEX "ProfilePassportStamp_roomId_idx" ON "ProfilePassportStamp"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilePassportStamp_userId_stampKey_key" ON "ProfilePassportStamp"("userId", "stampKey");

-- CreateIndex
CREATE INDEX "RoomPersona_userId_idx" ON "RoomPersona"("userId");

-- CreateIndex
CREATE INDEX "RoomPersona_roomId_idx" ON "RoomPersona"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomPersona_userId_roomId_key" ON "RoomPersona"("userId", "roomId");

-- AddForeignKey
ALTER TABLE "ProfileShowcaseSlot" ADD CONSTRAINT "ProfileShowcaseSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePassportStamp" ADD CONSTRAINT "ProfilePassportStamp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePassportStamp" ADD CONSTRAINT "ProfilePassportStamp_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPersona" ADD CONSTRAINT "RoomPersona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPersona" ADD CONSTRAINT "RoomPersona_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
