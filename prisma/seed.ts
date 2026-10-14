import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createClient() {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const prisma = createClient();

async function main() {
  // Ensure there is a designated Yahrzeit/Jorcajt type independent of display name
  const yahrzeitNameCandidates = ["Yahrzeit", "Jorcájt", "Jorcajt", "Jorcait"];
  const designatedYahrzeit = await prisma.eventType.findFirst({
    where: { isYahrzeit: true },
  });
  const matchedByName = designatedYahrzeit
    ? null
    : await prisma.eventType.findFirst({
        where: { name: { in: yahrzeitNameCandidates } },
      });

  if (designatedYahrzeit) {
    await prisma.eventType.update({
      where: { id: designatedYahrzeit.id },
      data: { isYahrzeit: true },
    });
  } else if (matchedByName) {
    await prisma.eventType.update({
      where: { id: matchedByName.id },
      data: { isYahrzeit: true },
    });
  } else {
    await prisma.eventType.create({
      data: { name: "Jorcajt", isYahrzeit: true },
    });
  }

  await prisma.eventType.upsert({
    where: { name: "Birthday" },
    update: {},
    create: { name: "Birthday" },
  });

  // Seed default yahrzeit relation options
  const yahrzeitRelations = ["Apa", "Anya", "Nagymama", "Nagyapa", "Sajat"];
  for (const name of yahrzeitRelations) {
    await prisma.yahrzeitRelationOption.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed default tags
  const tags = ["NF", "BJ", "Gedolim"];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
