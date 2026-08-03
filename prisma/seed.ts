import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

function createClient() {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const prisma = createClient();

async function main() {
  // Seed event types
  const eventTypes = ["Yahrzeit", "Birthday"];
  for (const name of eventTypes) {
    await prisma.eventType.upsert({
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

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });

  console.log("Seed complete.");
  console.log(`Admin user: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
