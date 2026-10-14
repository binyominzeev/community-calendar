-- CreateTable
CREATE TABLE "YahrzeitRelationOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "YahrzeitRelationOption_name_key" ON "YahrzeitRelationOption"("name");

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "yahrzeitRelationOptionId" INTEGER;

-- CreateIndex
CREATE INDEX "Event_yahrzeitRelationOptionId_idx" ON "Event"("yahrzeitRelationOptionId");
