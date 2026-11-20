import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "./app/generated/prisma/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "db.sqlite");
const prisma = new PrismaClient();

// Helper to convert Gregorian to Hebrew
function gregorianToHebrew(date) {
  const { HDate } = require("@hebcal/core");
  const hd = new HDate(date);
  return { day: hd.getDate(), month: hd.getMonthNumber() };
}

async function main() {
  try {
    // Create event type
    let eventType = await prisma.eventType.findUnique({
      where: { name: "Birthday" },
    });
    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: { name: "Birthday" },
      });
    }

    // Create a person with a Gregorian birth date (Albert Einstein)
    let person = await prisma.person.findFirst({
      where: { displayName: "Albert Einstein" },
    });

    if (person) {
      // Delete existing event
      await prisma.event.deleteMany({ where: { personId: person.id } });
    } else {
      person = await prisma.person.create({
        data: {
          displayName: "Albert Einstein",
          hebrewName: "אלברט אינשטיין",
        },
      });
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

    console.log("Created event:", event);

    // Create another person with only Hebrew date
    let person2 = await prisma.person.findFirst({
      where: { displayName: "Moshe Rabbeinu" },
    });

    if (person2) {
      await prisma.event.deleteMany({ where: { personId: person2.id } });
    } else {
      person2 = await prisma.person.create({
        data: {
          displayName: "Moshe Rabbeinu",
          hebrewName: "משה רבנו",
        },
      });
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

    console.log("Created event:", event2);
    console.log("Test data created successfully!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
