// Set up path alias resolution
import Module from "module";
import path from "path";
import { fileURLToPath } from "url";

const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id.startsWith("@/")) {
    const resolved = path.join(process.cwd(), id.replace("@/", ""));
    return originalRequire.call(this, resolved);
  }
  return originalRequire.call(this, id);
};

// Now import what we need
const { PrismaClient } = await import("./app/generated/prisma/client/index.js");
const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
const { HDate } = await import("@hebcal/core");

function gregorianToHebrew(date) {
  const hd = new HDate(date);
  return { day: hd.getDate(), month: hd.getMonthNumber() };
}

async function main() {
  const dbPath = path.join(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Creating test data...");

    // Create event type
    let eventType = await prisma.eventType.findUnique({
      where: { name: "Birthday" },
    });
    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: { name: "Birthday" },
      });
      console.log("✓ Created Birthday event type");
    }

    // Create a person with a Gregorian birth date (Albert Einstein)
    let person = await prisma.person.findFirst({
      where: { displayName: "Albert Einstein" },
    });

    if (person) {
      // Delete existing event
      await prisma.event.deleteMany({ where: { personId: person.id } });
      console.log("✓ Deleted existing Albert Einstein events");
    } else {
      person = await prisma.person.create({
        data: {
          displayName: "Albert Einstein",
          hebrewName: "אלברט אינשטיין",
        },
      });
      console.log("✓ Created Albert Einstein person");
    }

    // Create event with Gregorian date (1879-03-14)
    const civilDate = new Date(1879, 2, 14);
    const hebrew = gregorianToHebrew(civilDate);

    const event = await prisma.event.create({
      data: {
        personId: person.id,
        eventTypeId: eventType.id,
        hebrewDay: hebrew.day,
        hebrewMonth: hebrew.month,
        civilDate: civilDate,
        eventYear: 1879,
        remarks: "Renowned physicist",
      },
    });

    console.log("✓ Created Albert Einstein birthday event");
    console.log(`  Gregorian: 1879-03-14, Hebrew: ${hebrew.day} / ${hebrew.month}`);

    // Create another person with only Hebrew date
    let person2 = await prisma.person.findFirst({
      where: { displayName: "Moshe Rabbeinu" },
    });

    if (person2) {
      await prisma.event.deleteMany({ where: { personId: person2.id } });
      console.log("✓ Deleted existing Moshe Rabbeinu events");
    } else {
      person2 = await prisma.person.create({
        data: {
          displayName: "Moshe Rabbeinu",
          hebrewName: "משה רבנו",
        },
      });
      console.log("✓ Created Moshe Rabbeinu person");
    }

    const event2 = await prisma.event.create({
      data: {
        personId: person2.id,
        eventTypeId: eventType.id,
        hebrewDay: 7,
        hebrewMonth: 7, // Tishrei
        remarks: "Hebrew date only",
      },
    });

    console.log("✓ Created Moshe Rabbeinu birthday event");
    console.log(`  Hebrew only: 7 Tishrei`);

    console.log("\n✅ Test data created successfully!");
    console.log("\nOpen http://localhost:3000/calendar to see the calendar");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
