/**
 * Database setup script.
 * Applies migrations via better-sqlite3 and runs the seed.
 */
import Database from "better-sqlite3";
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

function seed(db: Database.Database) {
  const yahrzeitNameCandidates = ["Yahrzeit", "Jorcájt", "Jorcajt", "Jorcait"];
  const designated = db.prepare('SELECT id FROM "EventType" WHERE "isYahrzeit" = 1 LIMIT 1').get();
  if (!designated) {
    const placeholders = yahrzeitNameCandidates.map(() => "?").join(",");
    const matched = db
      .prepare(`SELECT id FROM "EventType" WHERE "name" IN (${placeholders}) LIMIT 1`)
      .get(...yahrzeitNameCandidates) as { id: number } | undefined;
    if (matched) {
      db.prepare('UPDATE "EventType" SET "isYahrzeit" = 1 WHERE "id" = ?').run(matched.id);
    } else {
      db.prepare('INSERT INTO "EventType" ("name", "isYahrzeit") VALUES (?, 1)').run("Jorcajt");
    }
  }

  db.prepare('INSERT OR IGNORE INTO "EventType" ("name") VALUES (?)').run("Birthday");

  for (const name of ["Apa", "Anya", "Nagymama", "Nagyapa", "Sajat"]) {
    db.prepare('INSERT OR IGNORE INTO "YahrzeitRelationOption" ("name") VALUES (?)').run(name);
  }

  for (const name of ["NF", "BJ", "Gedolim"]) {
    db.prepare('INSERT OR IGNORE INTO "Tag" ("name") VALUES (?)').run(name);
  }
}

function main() {
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  applyMigrations(db);
  seed(db);
  // A restart kills any running sync, so its lock flag would otherwise stay set.
  db.prepare(
    'UPDATE "GoogleAccount" SET "syncInProgress" = 0, "syncStartedAt" = NULL, "syncTotal" = 0, "syncDone" = 0, "syncCurrent" = NULL'
  ).run();
  db.close();

  console.log("Database setup complete.");
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
