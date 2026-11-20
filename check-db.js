const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const person = await prisma.person.findFirst({
    where: { displayName: { contains: "Orbán Kálmán" } },
    include: { 
      events: {
        include: { eventType: true }
      }
    }
  });

  console.log("Person:", JSON.stringify(person, null, 2));
  
  if (person && person.events) {
    console.log("\n\nEvents for this person:");
    person.events.forEach(e => {
      console.log(`  - Type: ${e.eventType.name}`);
      console.log(`    Hebrew: ${e.hebrewDay}/${e.hebrewMonth}`);
      console.log(`    Civil Date: ${e.civilDate}`);
      console.log(`    Event Year: ${e.eventYear}`);
    });
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
