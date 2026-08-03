-- CreateTable
CREATE TABLE "Person" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "hebrewName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PersonTag" (
    "personId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    PRIMARY KEY ("personId", "tagId"),
    CONSTRAINT "PersonTag_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "personId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "hebrewDay" INTEGER NOT NULL,
    "hebrewMonth" INTEGER NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_name_key" ON "EventType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
