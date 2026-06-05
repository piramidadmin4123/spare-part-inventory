# CLAUDE.md — Spare Part Inventory

> **อ่านไฟล์นี้ก่อนทำงานทุกครั้ง** — ระบบนี้เป็น internal tool ของทีม Piramid Solution สำหรับจัดการอะไหล่ IT (Spare Parts) ใช้งานจริงที่ production

---

## โครงสร้างโปรเจกต์ (pnpm monorepo)

```
/
├── apps/
│   ├── api/          Express + Prisma + TypeScript  (port 3001)
│   │   ├── src/
│   │   │   ├── modules/   (routers ทั้งหมด)
│   │   │   ├── lib/       (prisma, notify, scheduler, roles, audit)
│   │   │   └── middleware/
│   │   ├── prisma/    (schema.prisma + migrations)
│   │   └── api/       (Vercel serverless entry: _index.bundle.js, _cron.bundle.js)
│   └── web/          React + Vite + TypeScript + Tailwind  (port 5173)
│       └── src/
│           ├── pages/     (DashboardPage, InventoryPage, BorrowPage, ...)
│           └── features/  (api + hooks แยกตาม domain)
└── packages/
    └── shared/        Zod schemas + TypeScript types ใช้ร่วม web+api
```

---

## Stack และ Key Decisions

| Layer        | Tech                                    | หมายเหตุ                                |
| ------------ | --------------------------------------- | --------------------------------------- |
| Backend      | Express 4 + TypeScript                  | serverless บน Vercel                    |
| ORM          | Prisma 6 + PostgreSQL                   | DB = **Neon** (cloud)                   |
| Frontend     | React 18 + Vite + TanStack Query        | SPA                                     |
| Styling      | Tailwind v4 + shadcn/ui                 | component library                       |
| Auth         | JWT + Microsoft 365 SSO (Azure AD MSAL) | ผู้ใช้ login ผ่าน O365                  |
| Notification | Nodemailer (Gmail SMTP) + Teams webhook | แจ้งเตือนการยืม/คืน                     |
| Excel        | ExcelJS                                 | import/export ทั้ง spare parts + borrow |
| Deploy       | Vercel (web + api แยก project)          | push main → auto-deploy                 |

---

## DB Schema (Prisma) — ตัวสำคัญ

```
User          — ผู้ใช้ (roles: SUPER_ADMIN, ADMIN, MANAGER, TECHNICIAN, VIEWER)
Site          — สาขา/ไซต์ (BKK, KIS, REIGNWOOD, ...)
EquipmentType — ประเภทอุปกรณ์ (AP-A, SW-A, ...)
Brand         — แบรนด์ (Aruba, Cisco, Ruckus, ...)
SparePart     — อะไหล่ IT (status: IN_SERVICE | BORROWED | MAINTENANCE | LOST | DECOMMISSIONED)
BorrowTransaction — ประวัติการยืม (status: PENDING → APPROVED/REJECTED → RETURNED/CANCELLED)
AdditionalOrder   — รายการสั่งซื้อเพิ่ม
AuditLog          — log การเปลี่ยนแปลง
```

**ฟิลด์สำคัญใน BorrowTransaction:**

- `borrowDestination` — "Project / งาน" (บังคับ เช่น "Capella Hotel Migration")
- `project` — "Project Type" (ไม่บังคับ เช่น "Migration", "Maintenance")
- `borrowerName`, `borrowerEmail` — override ชื่อ/email ผู้ยืม (ต่างจาก `borrower` relation ที่เป็น User จริง)

**หมายเหตุ:** `IN_STOCK` ถูกลบออกแล้ว (ไม่ใช้) ใช้ `IN_SERVICE` แทน

---

## API Routes หลัก (`apps/api/src/modules/`)

| Module                       | Prefix                   | หมายเหตุ                                                          |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------- |
| auth                         | `/api/auth`              | JWT login + Microsoft O365 SSO                                    |
| inventory                    | `/api/spare-parts`       | CRUD spare parts (list **omit imageUrl** เพื่อลด payload)         |
| borrow                       | `/api/borrow`            | workflow ยืม/อนุมัติ/คืน                                          |
| excel                        | `/api/excel`             | import/export Excel + borrow-template + **monthly-borrow-export** |
| dashboard                    | `/api/dashboard`         | summary, borrow-timeline (รายเดือน), recent-borrows               |
| sites/brands/equipment-types | `/api/...`               | master data                                                       |
| users                        | `/api/users`             | จัดการผู้ใช้                                                      |
| additional-orders            | `/api/additional-orders` | รายการสั่งซื้อเพิ่ม                                               |
| audit-logs                   | `/api/audit-logs`        | ประวัติการเปลี่ยนแปลง                                             |

---

## ข้อควรรู้ก่อนแก้โค้ด

### 1. การ Deploy บน Vercel (สำคัญมาก)

- API ทำงานเป็น **serverless function** — ไม่ใช่ long-running server
- Build script: `node scripts/bundle.mjs` → สร้าง `api/_index.bundle.js` และ `api/_cron.bundle.js`
- **ทุกครั้งที่แก้ไข `apps/api/src/`** ต้อง rebuild bundle ก่อน deploy (Vercel ทำให้อัตโนมัติผ่าน `vercel-build`)
- `api/_cron.ts` — ยิงทุกวันตี 1 (ผ่าน Vercel Cron) สำหรับแจ้งเตือนกำหนดคืน + scheduler ใน `src/lib/scheduler.ts` ทำงานเมื่อรัน server ปกติ

### 2. `packages/shared` — ต้อง build ก่อนใช้

- เมื่อแก้ schema หรือ type ใน `packages/shared/src/` ต้อง `pnpm --filter @spare-part/shared build` ก่อน
- dist ถูก commit ไว้ใน repo (`packages/shared/dist/`) เพื่อให้ Vercel build ได้

### 3. รูปภาพ (imageUrl / imageData)

- เก็บเป็น **base64 ใน DB** (ไม่ได้ใช้ Supabase Storage จริงแม้จะ config ไว้)
- **list endpoint ไม่ส่ง `imageUrl`** (`omit: { imageUrl: true }`) เพื่อลด payload — ดึงเฉพาะตอนเปิดดู/แก้ไขรายตัว (GET `/api/spare-parts/:id`)
- Frontend ใช้ `useSparePart(id)` hook สำหรับโหลดรูปรายตัว

### 4. Excel Import — กฎชื่อ sheet

- Import อ่านเฉพาะ sheet ที่ชื่อขึ้นต้นด้วย **"Spare Parts"** → auto-map ไป site ตามชื่อ sheet
- ถ้าชื่อ sheet ไม่ใช่ "Spare Parts" (เช่น เปลี่ยนชื่อแท็บ) → ต้องเลือก "ไซต์เริ่มต้น" ก่อน import ถึงจะรับ
- คอลัมน์สำคัญ: `Project / งาน` → `borrowDestination` (บังคับ), `Project Type` → `project` (ไม่บังคับ)
- backward-compat: คอลัมน์ "Project" เก่า → map ไป `borrowDestination`

### 5. การแจ้งเตือน

- ส่งให้ role **ADMIN + SUPER_ADMIN** เท่านั้น (ไม่รวม MANAGER) — ดู `getAdminEmails()` ใน `src/lib/notify.ts`
- Email (Gmail SMTP) ตอนนี้ **App Password หมดอายุ** — ต้องสร้างใหม่ที่ myaccount.google.com แล้วอัปเดต `SMTP_PASS` ใน Vercel env
- Teams webhook ยังทำงานอยู่ปกติ

### 6. SUPER_ADMIN

- กำหนดผ่าน `SUPER_ADMIN_EMAILS` ใน `src/lib/roles.ts` (hardcode email list) หรือ role ใน DB
- มีสิทธิ์ force-delete บางอย่างที่ ADMIN ทำไม่ได้

---

## Frontend — Pattern ที่ใช้

```
src/features/<domain>/
├── api.ts        — axios calls
└── use<Domain>.ts — TanStack Query hooks

src/pages/
└── <Page>.tsx    — UI + local state + เรียก hooks จาก features/
```

- ใช้ `apiClient` จาก `src/lib/api-client.ts` (axios instance + JWT interceptor)
- Toast จาก `sonner`
- Form จาก `react-hook-form` + `zodResolver`
- UI components จาก `src/components/ui/` (shadcn/ui)

---

## คำสั่งที่ใช้บ่อย

```bash
pnpm dev                                          # รัน web + api พร้อมกัน
pnpm --filter @spare-part/api dev                 # รันเฉพาะ api
pnpm --filter @spare-part/web dev                 # รันเฉพาะ web
pnpm --filter @spare-part/api db:studio           # Prisma Studio
pnpm --filter @spare-part/api db:push             # sync schema → DB (dev)
pnpm --filter @spare-part/api exec prisma migrate deploy  # apply migrations (prod)
pnpm --filter @spare-part/api typecheck           # type-check api
pnpm --filter @spare-part/web typecheck           # type-check web
pnpm build                                        # build ทั้งหมด
```

---

## สิ่งที่ยังค้างอยู่ / Known Issues

- **Gmail App Password หมดอายุ** — อีเมลส่งไม่ได้จนกว่าจะสร้าง App Password ใหม่ใส่ `SMTP_PASS`
- **`JWT_SECRET`** ใน `.env` ยังเป็นค่า default — ควรเปลี่ยนก่อน production จริง

---

## ไฟล์เอกสารใน repo

| ไฟล์                  | เนื้อหา                                                |
| --------------------- | ------------------------------------------------------ |
| `CLAUDE.md`           | ไฟล์นี้ — context สำหรับ AI                            |
| `HANDOVER.md`         | คู่มือส่งมอบระบบ (localhost + VM deploy + ลิงก์บริการ) |
| `HANDOVER-SECRETS.md` | **gitignored** — .env จริง + รหัสผ่าน (ส่งทางส่วนตัว)  |
| `.env.example`        | template env ที่ไม่มี secret                           |

---

## Repo & Production URLs

- **GitHub:** https://github.com/piramidadmin4123/spare-part-inventory (private)
- **Web (prod):** https://spare-part-inventory-web.vercel.app
- **API (prod):** ดูใน Vercel dashboard
- **DB:** Neon → https://console.neon.tech
