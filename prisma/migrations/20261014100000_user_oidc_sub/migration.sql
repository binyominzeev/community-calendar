ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" ADD COLUMN "oidcSub" TEXT;
CREATE UNIQUE INDEX "User_oidcSub_key" ON "User"("oidcSub");
