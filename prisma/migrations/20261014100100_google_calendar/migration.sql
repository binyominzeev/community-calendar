CREATE TABLE "GoogleAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "googleEmail" TEXT,
    "encryptedRefreshToken" TEXT NOT NULL,
    "encryptedAccessToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "calendarId" TEXT,
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "syncStartedAt" DATETIME,
    "lastSyncAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GoogleAccount_userId_key" ON "GoogleAccount"("userId");

CREATE TABLE "GoogleSyncItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "googleAccountId" INTEGER NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    CONSTRAINT "GoogleSyncItem_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GoogleSyncItem_googleAccountId_sourceKey_key" ON "GoogleSyncItem"("googleAccountId", "sourceKey");
