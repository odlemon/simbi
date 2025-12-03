import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.seller.deleteMany({
    where: { email: "tatenda@niakazi.com" },
  });

  console.log(`Deleted ${deleted.count} buyer record(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to delete test user:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

