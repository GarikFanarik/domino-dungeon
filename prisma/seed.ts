import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { discordId: 'test-user-123' },
    update: {},
    create: { discordId: 'test-user-123', username: 'TestPlayer' },
  });
  console.log('Seeded user:', user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
