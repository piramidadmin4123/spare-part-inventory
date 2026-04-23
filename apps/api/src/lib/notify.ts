import nodemailer from 'nodemailer';
import { prisma } from './prisma.js';

// ── Config ─────────────────────────────────────────────────────────────────

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER ?? 'noreply@piramid.com';
const EXTRA_NOTIFY_EMAILS = (process.env.NOTIFY_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const BORROW_PAGE_URL = 'https://spare-part-inventory-web.vercel.app/borrow';

async function getAdminEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    select: { email: true },
  });
  const dbEmails = users.map((u) => u.email).filter(Boolean) as string[];
  return [...new Set([...dbEmails, ...EXTRA_NOTIFY_EMAILS])];
}

// ── Teams ──────────────────────────────────────────────────────────────────

interface TeamsCard {
  title: string;
  text: string;
  facts?: { name: string; value: string }[];
  actionUrl?: string;
  actionLabel?: string;
  themeColor?: string;
}

export async function sendTeams(card: TeamsCard): Promise<void> {
  if (!TEAMS_WEBHOOK_URL) return;
  try {
    const body = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: card.themeColor ?? 'F59E0B',
      summary: card.title,
      sections: [
        {
          activityTitle: `**${card.title}**`,
          activityText: card.text,
          facts: card.facts ?? [],
        },
      ],
      ...(card.actionUrl && {
        potentialAction: [
          {
            '@type': 'OpenUri',
            name: card.actionLabel ?? 'ดูรายละเอียด',
            targets: [{ os: 'default', uri: card.actionUrl }],
          },
        ],
      }),
    };

    await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[Teams notify error]', err);
  }
}

// ── Email ──────────────────────────────────────────────────────────────────

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function emailTemplate(title: string, rows: { label: string; value: string }[], bodyText?: string) {
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 12px;font-weight:600;color:#555;white-space:nowrap">${r.label}</td>
        <td style="padding:6px 12px;color:#111">${r.value}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1c1c1c;padding:20px 24px;display:flex;align-items:center;gap:12px">
      <div style="font-size:18px;font-weight:700;color:#fff">Piramid Solution</div>
      <div style="font-size:12px;color:#f59e0b;margin-left:4px">Spare Part Management</div>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:16px;color:#111">${title}</h2>
      ${bodyText ? `<p style="margin:0 0 16px;color:#555;font-size:14px">${bodyText}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f9f9f9;border-radius:6px">${rowsHtml}</table>
    </div>
    <div style="padding:12px 24px;background:#f4f4f5;font-size:11px;color:#999;text-align:center">
      Piramid Solution Spare Part Management — อีเมลนี้ถูกส่งอัตโนมัติ ไม่ต้องตอบกลับ
    </div>
  </div>
</body></html>`;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  title: string;
  rows: { label: string; value: string }[];
  bodyText?: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"Piramid Solution" <${SMTP_FROM}>`,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      html: emailTemplate(opts.title, opts.rows, opts.bodyText),
    });
  } catch (err) {
    console.error('[Email notify error]', err);
  }
}

// ── Notification helpers ───────────────────────────────────────────────────

interface BorrowInfo {
  id: string;
  modelCode: string;
  productName: string;
  siteCode: string;
  borrowerName: string;
  borrowerEmail?: string | null;
  project?: string | null;
}

export async function notifyNewBorrow(info: BorrowInfo) {
  const adminEmails = await getAdminEmails();
  const facts = [
    { name: 'อุปกรณ์', value: `${info.modelCode} — ${info.productName}` },
    { name: 'Site', value: info.siteCode },
    { name: 'ผู้ยืม', value: info.borrowerName },
    ...(info.project ? [{ name: 'Project', value: info.project }] : []),
  ];

  await Promise.all([
    sendTeams({
      title: '📋 คำขอยืมใหม่ รออนุมัติ',
      text: `**${info.borrowerName}** ขอยืม **${info.modelCode}**`,
      facts,
      actionUrl: BORROW_PAGE_URL,
      actionLabel: 'อนุมัติ / ปฏิเสธ',
      themeColor: 'F59E0B',
    }),
    adminEmails.length > 0 &&
      sendEmail({
        to: adminEmails,
        subject: `[รออนุมัติ] คำขอยืม ${info.modelCode} — ${info.borrowerName}`,
        title: 'มีคำขอยืม Spare Part ใหม่',
        rows: facts.map((f) => ({ label: f.name, value: f.value })),
        bodyText: `กรุณาเข้าระบบเพื่ออนุมัติหรือปฏิเสธคำขอ<br/><a href="${BORROW_PAGE_URL}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:10px;padding:10px 14px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">ไปหน้า ยืม / คืน</a>`,
      }),
  ]);
}

export async function notifyBorrowApproved(info: BorrowInfo & { approverName: string }) {
  const adminEmails = await getAdminEmails();
  const facts = [
    { name: 'อุปกรณ์', value: `${info.modelCode} — ${info.productName}` },
    { name: 'Site', value: info.siteCode },
    { name: 'ผู้อนุมัติ', value: info.approverName },
  ];

  const emailTargets = [...(info.borrowerEmail ? [info.borrowerEmail] : []), ...adminEmails].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  await Promise.all([
    sendTeams({
      title: '✅ อนุมัติคำขอยืมแล้ว',
      text: `**${info.borrowerName}** ได้รับอนุมัติยืม **${info.modelCode}**`,
      facts,
      themeColor: '22c55e',
    }),
    emailTargets.length > 0 &&
      sendEmail({
        to: emailTargets,
        subject: `[อนุมัติแล้ว] คำขอยืม ${info.modelCode}`,
        title: 'คำขอยืมของคุณได้รับการอนุมัติ',
        rows: facts.map((f) => ({ label: f.name, value: f.value })),
        bodyText: `คำขอยืม <strong>${info.modelCode}</strong> ของ ${info.borrowerName} ได้รับการอนุมัติแล้ว`,
      }),
  ]);
}

export async function notifyBorrowRejected(
  info: BorrowInfo & { approverName: string; reason?: string }
) {
  const facts = [
    { name: 'อุปกรณ์', value: `${info.modelCode} — ${info.productName}` },
    { name: 'Site', value: info.siteCode },
    { name: 'ผู้ปฏิเสธ', value: info.approverName },
    ...(info.reason ? [{ name: 'เหตุผล', value: info.reason }] : []),
  ];

  const emailTargets = info.borrowerEmail ? [info.borrowerEmail] : [];

  await Promise.all([
    sendTeams({
      title: '❌ ปฏิเสธคำขอยืม',
      text: `คำขอยืม **${info.modelCode}** ของ **${info.borrowerName}** ถูกปฏิเสธ`,
      facts,
      themeColor: 'ef4444',
    }),
    emailTargets.length > 0 &&
      sendEmail({
        to: emailTargets,
        subject: `[ปฏิเสธ] คำขอยืม ${info.modelCode}`,
        title: 'คำขอยืมของคุณถูกปฏิเสธ',
        rows: facts.map((f) => ({ label: f.name, value: f.value })),
      }),
  ]);
}

export async function notifyBorrowReturned(info: BorrowInfo & { approverName?: string }) {
  const adminEmails = await getAdminEmails();
  const facts = [
    { name: 'อุปกรณ์', value: `${info.modelCode} — ${info.productName}` },
    { name: 'Site', value: info.siteCode },
    { name: 'ผู้คืน', value: info.borrowerName },
  ];

  await Promise.all([
    sendTeams({
      title: '↩️ คืนอุปกรณ์แล้ว',
      text: `**${info.borrowerName}** คืน **${info.modelCode}** เรียบร้อยแล้ว`,
      facts,
      themeColor: '6366f1',
    }),
    adminEmails.length > 0 &&
      sendEmail({
        to: adminEmails,
        subject: `[คืนแล้ว] ${info.modelCode} — ${info.borrowerName}`,
        title: 'อุปกรณ์ถูกคืนเข้าระบบแล้ว',
        rows: facts.map((f) => ({ label: f.name, value: f.value })),
      }),
  ]);
}

export async function notifyDueReturn(
  items: {
    id: string;
    modelCode: string;
    productName: string;
    siteCode: string;
    borrowerName: string;
    borrowerEmail?: string | null;
    expectedReturn: Date;
  }[]
) {
  if (items.length === 0) return;

  await Promise.all(
    items.map(async (item) => {
      const dateStr = item.expectedReturn.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const facts = [
        { name: 'อุปกรณ์', value: `${item.modelCode} — ${item.productName}` },
        { name: 'Site', value: item.siteCode },
        { name: 'กำหนดคืน', value: dateStr },
      ];

      const adminEmails = await getAdminEmails();
      const emailTargets = [
        ...(item.borrowerEmail ? [item.borrowerEmail] : []),
        ...adminEmails,
      ].filter((v, i, a) => a.indexOf(v) === i);

      await Promise.all([
        sendTeams({
          title: '⏰ แจ้งเตือน: ใกล้ถึงกำหนดคืนอุปกรณ์',
          text: `**${item.borrowerName}** กรุณาคืน **${item.modelCode}** ภายในวันพรุ่งนี้`,
          facts,
          actionUrl: BORROW_PAGE_URL,
          actionLabel: 'ดูรายการยืม',
          themeColor: 'F59E0B',
        }),
        emailTargets.length > 0 &&
          sendEmail({
            to: emailTargets,
            subject: `[แจ้งเตือน] กำหนดคืน ${item.modelCode} — ${dateStr}`,
            title: 'แจ้งเตือน: ใกล้ถึงกำหนดคืนอุปกรณ์',
            rows: facts.map((f) => ({ label: f.name, value: f.value })),
            bodyText: `กรุณาคืนอุปกรณ์ <strong>${item.modelCode}</strong> ภายในวันพรุ่งนี้ ${dateStr}`,
          }),
      ]);
    })
  );
}

export async function notifyLowStock(
  items: { modelCode: string; siteCode: string; quantity: number; minStock: number }[]
) {
  if (items.length === 0) return;
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return;

  const facts = items.slice(0, 10).map((i) => ({
    name: `${i.modelCode} [${i.siteCode}]`,
    value: `เหลือ ${i.quantity} / min ${i.minStock}`,
  }));

  await Promise.all([
    sendTeams({
      title: `⚠️ แจ้งเตือน Stock ต่ำ (${items.length} รายการ)`,
      text: 'มีอุปกรณ์ที่ stock ต่ำกว่าที่กำหนด',
      facts,
      actionUrl: `${APP_URL}/inventory`,
      actionLabel: 'ดู Inventory',
      themeColor: 'ef4444',
    }),
    sendEmail({
      to: adminEmails,
      subject: `[แจ้งเตือน] Stock ต่ำ ${items.length} รายการ`,
      title: `แจ้งเตือน: Stock ต่ำกว่าที่กำหนด ${items.length} รายการ`,
      rows: facts.map((f) => ({ label: f.name, value: f.value })),
      bodyText: 'กรุณาตรวจสอบและเติม Stock',
    }),
  ]);
}
