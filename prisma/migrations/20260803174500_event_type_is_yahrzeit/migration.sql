-- AlterTable
ALTER TABLE "EventType" ADD COLUMN "isYahrzeit" BOOLEAN NOT NULL DEFAULT false;

-- Backfill by common names
UPDATE "EventType"
SET "isYahrzeit" = true
WHERE lower("name") IN ('yahrzeit', 'jorcajt', 'jorcait')
   OR "name" IN ('Yahrzeit', 'Jorcájt', 'Jorcajt');

-- Backfill by existing relation usage (strongest signal)
UPDATE "EventType"
SET "isYahrzeit" = true
WHERE "id" IN (
  SELECT DISTINCT "eventTypeId"
  FROM "Event"
  WHERE "yahrzeitRelationOptionId" IS NOT NULL
);
