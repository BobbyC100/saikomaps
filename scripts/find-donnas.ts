import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findDonnas() {
  const donnas = await prisma.golden_records.findMany({
    where: {
      OR: [
        { name: { contains: 'Donna', mode: 'insensitive' } },
        { slug: { contains: 'donna', mode: 'insensitive' } },
      ],
      website: { not: null },
    },
    select: {
      name: true,
      slug: true,
      website: true,
      neighborhood: true,
    },
  });

  console.log(JSON.stringify(donnas, null, 2));
  await prisma.$disconnect();
}

findDonnas();
