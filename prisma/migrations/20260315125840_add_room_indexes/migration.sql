-- CreateIndex
CREATE INDEX "Room_isPublic_createdAt_idx" ON "Room"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "Room_hostId_idx" ON "Room"("hostId");

-- CreateIndex
CREATE INDEX "Room_onlineCount_updatedAt_idx" ON "Room"("onlineCount", "updatedAt");

-- AddForeignKey
ALTER TABLE "FavoriteRoom" ADD CONSTRAINT "FavoriteRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
