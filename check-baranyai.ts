import { prisma } from "@/lib/db";

async function main() {
  const person = await prisma.person.findFirst({
    where: { displayName: { contains: "Baranyai" } },
    include: { 
      events: {
        include: { eventType: true }
      }
    }
  });

  if (!person) {
    console.log("❌ Baranyai nem található az adatbázisban");
    process.exit(0);
  }

  console.log(`✓ Talált: ${person.displayName} (ID: ${person.id})`);
  console.log(`\nEventek (összesen: ${person.events.length}):`);
  
  if (person.events.length === 0) {
    console.log("  → Nincsenek eventok!");
  } else {
    person.events.forEach((e, i) => {
      console.log(`\n  [${i + 1}] ${e.eventType.name}`);
      console.log(`      Hebrew: ${e.hebrewDay}/${e.hebrewMonth}`);
      console.log(`      Civil Date: ${e.civilDate ? e.civilDate.toISOString().split('T')[0] : 'NULL'}`);
      console.log(`      Event Year: ${e.eventYear}`);
    });
  }
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
