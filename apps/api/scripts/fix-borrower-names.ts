import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const prefix = 'ผู้ยืม (นำเข้า): ';

  const txs = await prisma.borrowTransaction.findMany({
    where: {
      borrowerName: null,
      borrowerRemark: { startsWith: prefix },
    },
    select: { id: true, borrowerRemark: true },
  });

  console.log(`Found ${txs.length} transactions to fix`);

  let updated = 0;
  for (const tx of txs) {
    const name = tx.borrowerRemark!.replace(prefix, '').trim();
    if (!name) continue;
    await prisma.borrowTransaction.update({
      where: { id: tx.id },
      data: { borrowerName: name },
    });
    console.log(`  ${tx.id} → borrowerName = "${name}"`);
    updated++;
  }

  console.log(`Done: updated ${updated} records`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
