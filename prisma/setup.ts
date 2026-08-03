/**
 * Database setup script.
 * Applies migrations via better-sqlite3 and runs the seed.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");
const MIGRATIONS_DIR = path.resolve(process.cwd(), "prisma/migrations");

function applyMigrations(db: Database.Database) {
  // Ensure _prisma_migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      finished_at DATETIME,
      migration_name TEXT NOT NULL,
      logs TEXT,
      rolled_back_at DATETIME,
      started_at DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  const applied = new Set(
    (db.prepare("SELECT migration_name FROM _prisma_migrations").all() as { migration_name: string }[]).map(
      (r) => r.migration_name
    )
  );

  const migrationFolders = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((d) => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
    .sort();

  for (const folder of migrationFolders) {
    if (applied.has(folder)) continue;
    const sqlFile = path.join(MIGRATIONS_DIR, folder, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const sql = fs.readFileSync(sqlFile, "utf8");
    console.log(`Applying migration: ${folder}`);
    try {
      db.exec(sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        console.log(`  Tables already exist, marking migration as applied.`);
      } else {
        throw err;
      }
    }
    db.prepare(
      "INSERT OR IGNORE INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (?, ?, ?, ?, ?)"
    ).run(folder, "manual", folder, new Date().toISOString(), 1);
  }
}

async function main() {
  // Apply migrations via raw SQLite
  const rawDb = new Database(DB_PATH);
  rawDb.pragma("foreign_keys = ON");
  applyMigrations(rawDb);
  rawDb.close();

  // Now seed via Prisma client
  const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

  const eventTypes = ["Yahrzeit", "Birthday"];
  for (const name of eventTypes) {
    await prisma.eventType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const tags = ["NF", "BJ", "Gedolim"];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });

  await prisma.$disconnect();

  console.log("Database setup complete.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
