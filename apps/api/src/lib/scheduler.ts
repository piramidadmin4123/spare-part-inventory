import cron from 'node-cron';
import { prisma } from './prisma.js';
import { notifyDueReturn } from './notify.js';

export function startScheduler() {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.info('[Scheduler] Running due-return check...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const dueTomorrow = await prisma.borrowTransaction.findMany({
        where: {
          status: 'APPROVED',
          expectedReturn: { gte: tomorrow, lt: dayAfter },
        },
        include: {
          sparePart: { include: { site: true } },
          borrower: { select: { email: true } },
        },
      });

      if (dueTomorrow.length === 0) {
        console.info('[Scheduler] No due returns tomorrow.');
        return;
      }

      console.info(`[Scheduler] Found ${dueTomorrow.length} due return(s) tomorrow.`);

      await notifyDueReturn(
        dueTomorrow.map((tx) => ({
          id: tx.id,
          modelCode: tx.sparePart.modelCode,
          productName: tx.sparePart.productName,
          siteCode: tx.sparePart.site.code,
          borrowerName: tx.borrowerName ?? tx.borrower.email,
          borrowerEmail: tx.borrowerEmail ?? tx.borrower.email,
          expectedReturn: tx.expectedReturn!,
        }))
      );

      console.info('[Scheduler] Due-return notifications sent.');
    } catch (err) {
      console.error('[Scheduler] due-return check failed:', err);
    }
  });

  console.info('[Scheduler] Started — due-return check at 08:00 daily.');
}
