import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../src/lib/prisma.js';
import { notifyDueReturn } from '../src/lib/notify.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
      return res.json({ ok: true, sent: 0 });
    }

    await notifyDueReturn(
      dueTomorrow.map((tx) => ({
        id: tx.id,
        modelCode: tx.sparePart.modelCode,
        productName: tx.sparePart.productName,
        siteCode: tx.sparePart.site.code,
        borrowerName: tx.borrowerName ?? tx.borrower.email ?? 'Unknown',
        borrowerEmail: tx.borrowerEmail ?? tx.borrower.email,
        expectedReturn: tx.expectedReturn!,
      }))
    );

    return res.json({ ok: true, sent: dueTomorrow.length });
  } catch (err) {
    console.error('[Cron] due-return check failed:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
