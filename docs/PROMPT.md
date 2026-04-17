    # 🚀 Claude Code Prompt — Inventory Spare Part Management System

**วิธีใช้:** copy เนื้อหาใน `PROMPT.md` (ไฟล์นี้) ไปวางใน Claude Code ตอนเริ่มโปรเจคใหม่ แล้วให้รันตามลำดับ

---

## 📋 Context & Background

ฉันเป็นนักศึกษาฝึกงานที่บริษัท Pyramid Solution แผนก Service ต้องการให้สร้างระบบ Web Application
สำหรับจัดการ Inventory Spare Part แทนการใช้ไฟล์ Excel เดิม

**ข้อมูลจริงที่ต้องรองรับ:**

- อุปกรณ์ประเภท: Access Point (Aruba, Cisco, Ruckus, Huawei, Ruijie), Switch (8/24/48 port, POE/non-POE),
  CCTV (Dome, Bullet), Firewall (Fortigate, Mikrotik), Mini GBIC, Fiber Cable, NVR, Media Converter, HDD
- 5 Site: BKK, REIGNWOOD (ปัจจุบัน + เก่า), KIS, TEACHER DORM, PKT
- Status หลากหลาย: In Service, Service BKK, Service PKT, Service SMI, onsite, ห้อง PJ, ห้อง BD, สมุย
- ประมาณ 145 รายการทั้งหมด (85 มีอยู่จริง + 60 ที่ต้องสั่งเพิ่ม)
- 33 รายการกำลังถูกยืม

---

## 🎯 Goal

สร้างระบบ full-stack Web App โดย:

- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT)
- **Hosting**: Frontend บน Vercel, Backend บน Railway/Render

---

## 📐 Tech Stack (กำหนดแน่นอน — ห้ามเปลี่ยน)

### Frontend

```
- React 18 + Vite + TypeScript
- TailwindCSS + shadcn/ui
- TanStack Query (server state) + Zustand (UI state)
- React Hook Form + Zod (validation)
- Lucide icons
- date-fns (date handling)
- React Router v6
```

### Backend

```
- Node.js 20 + Express + TypeScript
- Prisma ORM (migration + type-safe queries)
- Zod (validation — ใช้ schema ร่วมกับ frontend ได้)
- @supabase/supabase-js (สำหรับ auth verification)
- jsonwebtoken + bcrypt
- multer (file upload)
- exceljs + xlsx (Excel I/O)
```

### DevOps

```
- ESLint + Prettier
- Husky + lint-staged (pre-commit)
- GitHub Actions (CI — optional)
- pnpm workspaces (monorepo)
```

---

## 🗂️ Project Structure ที่ต้องการ

```
spare-part-inventory/
├── apps/
│   ├── web/                    # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/     # UI components (ใช้ shadcn/ui เป็นหลัก)
│   │   │   ├── features/       # feature-based modules
│   │   │   │   ├── auth/
│   │   │   │   ├── inventory/
│   │   │   │   ├── borrow/
│   │   │   │   ├── sites/
│   │   │   │   └── dashboard/
│   │   │   ├── lib/            # utils, api client, supabase client
│   │   │   ├── hooks/
│   │   │   ├── pages/          # route pages
│   │   │   ├── store/          # Zustand stores
│   │   │   ├── types/          # shared types
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── api/                    # Backend (Express)
│       ├── src/
│       │   ├── modules/        # feature modules
│       │   │   ├── auth/
│       │   │   ├── inventory/
│       │   │   ├── borrow/
│       │   │   ├── sites/
│       │   │   ├── excel/
│       │   │   └── notifications/
│       │   ├── middleware/     # auth, error, logger
│       │   ├── lib/            # prisma, supabase, utils
│       │   ├── types/
│       │   └── server.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── package.json
│
├── packages/
│   └── shared/                 # shared types + Zod schemas
│       ├── src/
│       │   ├── schemas/        # Zod schemas ใช้ร่วม FE/BE
│       │   └── types/
│       └── package.json
│
├── .env.example
├── README.md
├── pnpm-workspace.yaml
└── package.json
```

---

## 🗃️ Database Schema (Prisma)

สร้าง `schema.prisma` ตามนี้ — ทำให้รองรับข้อมูลจริงจากไฟล์ Excel

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  MANAGER
  TECHNICIAN
  VIEWER
}

enum ItemStatus {
  IN_SERVICE        // In Service
  BORROWED          // กำลังถูกยืม
  IN_STOCK          // เก็บในห้อง service
  MAINTENANCE       // ซ่อม
  LOST              // หาย
  DECOMMISSIONED    // ปลดระวาง
}

enum BorrowStatus {
  PENDING
  APPROVED
  REJECTED
  RETURNED
  CANCELLED
}

enum OrderStatus {
  PENDING
  ORDERED
  RECEIVED
  CANCELLED
}

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String
  role        UserRole @default(TECHNICIAN)
  phone       String?
  lineUserId  String?  // สำหรับ LINE Notify
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  borrowRequests   BorrowTransaction[] @relation("Borrower")
  approvedBorrows  BorrowTransaction[] @relation("Approver")
  auditLogs        AuditLog[]
}

model Site {
  id          String @id @default(uuid())
  code        String @unique          // BKK, REIGNWOOD_CUR, REIGNWOOD_OLD, KIS, TEACHER_DORM, PKT
  name        String                  // "Bangkok HQ", "Reignwood (ปัจจุบัน)"
  description String?
  address     String?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())

  spareParts       SparePart[]
  additionalOrders AdditionalOrder[]
}

model EquipmentType {
  id       String @id @default(uuid())
  code     String @unique  // AP-A, AP-C, AP-R, CCTV Dome, Switch24, FW, etc.
  name     String
  category String          // "Access Point", "Switch", "CCTV", "Firewall", "Network"
  icon     String?

  spareParts SparePart[]
}

model Brand {
  id   String @id @default(uuid())
  name String @unique      // Aruba, Cisco, Ruckus, Huawei, Hikvision, Fortinet, etc.

  spareParts       SparePart[]
  additionalOrders AdditionalOrder[]
}

model SparePart {
  id             String     @id @default(uuid())
  siteId         String
  site           Site       @relation(fields: [siteId], references: [id])
  equipmentTypeId String
  equipmentType  EquipmentType @relation(fields: [equipmentTypeId], references: [id])
  brandId        String
  brand          Brand      @relation(fields: [brandId], references: [id])

  materialCode   String?    // ONWS005C500001
  modelCode      String     // IAP-103-RW, DS-2CD1323G0-IUF, etc.
  productName    String     @db.Text  // full product description
  serialNumber   String?    @unique
  macAddress     String?

  quantity       Int        @default(1)
  minStock       Int        @default(1)    // สำหรับ low stock alert
  cost           Decimal?   @db.Decimal(12, 2)

  status         ItemStatus @default(IN_SERVICE)
  location       String?    // "ห้อง service", "ห้อง PJ", "สมุย", "onsite"
  remark         String?    @db.Text
  imageUrl       String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  borrowTransactions BorrowTransaction[]

  @@index([siteId])
  @@index([equipmentTypeId])
  @@index([brandId])
  @@index([status])
  @@index([serialNumber])
}

model BorrowTransaction {
  id             String       @id @default(uuid())
  sparePartId    String
  sparePart      SparePart    @relation(fields: [sparePartId], references: [id])

  borrowerId     String
  borrower       User         @relation("Borrower", fields: [borrowerId], references: [id])
  approverId     String?
  approver       User?        @relation("Approver", fields: [approverId], references: [id])

  status         BorrowStatus @default(PENDING)
  project        String?      // "Capella", "BIK-18"
  dateStart      DateTime?
  dateEnd        DateTime?
  expectedReturn DateTime?
  actualReturn   DateTime?

  borrowerRemark String?      @db.Text
  approverRemark String?      @db.Text

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([sparePartId])
  @@index([borrowerId])
  @@index([status])
}

model AdditionalOrder {
  id          String      @id @default(uuid())
  siteId      String?
  site        Site?       @relation(fields: [siteId], references: [id])
  brandId     String?
  brand       Brand?      @relation(fields: [brandId], references: [id])

  type        String      // "Fiber", "FW", "Switch", "Router / Firewall"
  modelCode   String?
  productName String      @db.Text
  quantity    Int         @default(1)
  unitCost    Decimal?    @db.Decimal(12, 2)
  totalCost   Decimal?    @db.Decimal(12, 2)
  status      OrderStatus @default(PENDING)
  remark      String?     @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  action     String   // "CREATE", "UPDATE", "DELETE", "BORROW", "APPROVE", "RETURN"
  entityType String   // "SparePart", "BorrowTransaction", "User"
  entityId   String
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 🔌 REST API Endpoints ที่ต้องสร้าง

### Auth

- `POST   /api/auth/register`
- `POST   /api/auth/login`
- `POST   /api/auth/logout`
- `GET    /api/auth/me`
- `PATCH  /api/auth/profile`

### Sites

- `GET    /api/sites` — list all sites
- `POST   /api/sites` — create (admin only)
- `GET    /api/sites/:id`
- `PATCH  /api/sites/:id`
- `DELETE /api/sites/:id` — soft delete

### Equipment Types & Brands

- `GET    /api/equipment-types`
- `GET    /api/brands`
- (CRUD for admin)

### Spare Parts (core)

- `GET    /api/spare-parts` — with filter: siteId, status, typeId, brandId, search
- `POST   /api/spare-parts`
- `GET    /api/spare-parts/:id`
- `PATCH  /api/spare-parts/:id`
- `DELETE /api/spare-parts/:id`
- `POST   /api/spare-parts/:id/image` — upload image

### Borrow Transactions

- `GET    /api/borrow` — with filter: status, borrowerId, sparePartId
- `POST   /api/borrow` — create borrow request
- `GET    /api/borrow/:id`
- `PATCH  /api/borrow/:id/approve` — manager approves (ลด stock อัตโนมัติ)
- `PATCH  /api/borrow/:id/reject`
- `PATCH  /api/borrow/:id/return` — คืนของ (เพิ่ม stock กลับ)
- `PATCH  /api/borrow/:id/cancel`

### Additional Orders

- `GET    /api/additional-orders`
- `POST   /api/additional-orders`
- `PATCH  /api/additional-orders/:id`
- `POST   /api/additional-orders/:id/convert` — ย้ายเป็น spare_part เมื่อของมาถึง

### Excel Import/Export

- `POST   /api/excel/import` — upload .xlsx → parse → bulk insert (admin only)
- `GET    /api/excel/export` — download spare_parts.xlsx
- `GET    /api/excel/template` — download template

### Dashboard

- `GET    /api/dashboard/summary` — จำนวนรวม, แยกตาม type, site, status
- `GET    /api/dashboard/low-stock`
- `GET    /api/dashboard/recent-borrows`

### Audit Log

- `GET    /api/audit-logs` — admin only, with pagination

---

## 🎨 Frontend Pages ที่ต้องสร้าง

```
/                           → Redirect to /login หรือ /dashboard
/login
/register                   → (ถ้าเปิดให้สมัครเอง)
/dashboard                  → Summary cards + charts + low-stock + recent borrows
/inventory                  → Table with filters (site, type, brand, status, search)
/inventory/new              → Create form
/inventory/:id              → Detail view
/inventory/:id/edit
/sites                      → List sites + count per site
/sites/:id                  → Items ใน site นี้
/borrow                     → Borrow requests list (tab: pending / active / history)
/borrow/new                 → ขอยืม
/borrow/:id                 → Detail + approve/reject buttons (ถ้าเป็น manager)
/additional-orders          → Rายการสั่งซื้อเพิ่ม
/reports                    → Export รายงาน
/settings                   → Users, sites, types, brands management
/profile
```

---

## 🚦 Development Phases (แบ่งให้สั่ง Claude Code ทีละ phase)

### Phase 1: Setup & Infrastructure

1. Init monorepo ด้วย pnpm workspaces
2. Setup frontend (Vite + React + TS + Tailwind + shadcn/ui)
3. Setup backend (Express + TS + Prisma)
4. Setup shared package
5. สร้าง `.env.example`, `README.md`, `.gitignore`
6. รัน `prisma init` + สร้าง schema + migration แรก

### Phase 2: Auth & User Management

1. Supabase Auth integration
2. Login/Register/Logout pages
3. Protected routes + role-based guards
4. JWT middleware ใน backend

### Phase 3: Sites + Equipment Types + Brands (Master Data)

1. CRUD API + UI
2. Seed script จากข้อมูล Excel
3. Admin-only permission

### Phase 4: Spare Parts CRUD (Core)

1. API endpoints ครบทุก operation
2. Table view พร้อม filter/search/pagination (TanStack Table)
3. Create/Edit form (React Hook Form + Zod)
4. Detail page
5. Image upload (Supabase Storage)

### Phase 5: Borrow/Return Workflow

1. Borrow request form
2. Manager approval UI
3. Status transitions (Pending → Approved/Rejected → Returned)
4. Stock adjustment logic (ลด/เพิ่ม อัตโนมัติ)
5. Audit log integration

### Phase 6: Excel Import/Export

1. Upload handler + parser (SheetJS)
2. Mapping logic จาก Excel structure → DB schema
3. Validation + error report
4. Export endpoint (ExcelJS)

### Phase 7: Dashboard & Reports

1. Summary API (aggregation queries)
2. Recharts integration
3. Low stock alerts
4. Export รายงานหลายแบบ

### Phase 8: Notifications

1. LINE Notify integration
2. Trigger: borrow request, low stock, approval
3. Email fallback (Nodemailer)

### Phase 9: Polish

1. Responsive design
2. Loading states, error boundaries
3. Empty states
4. i18n (ไทย/English)

### Phase 10: Deployment

1. Vercel setup (frontend)
2. Railway/Render setup (backend)
3. Supabase production env
4. CI/CD

---

## 📝 Coding Standards

1. **TypeScript strict mode** เปิด
2. **ไม่ใช้ `any`** — ใช้ `unknown` หรือ proper type
3. **ES Modules** ทั้ง frontend และ backend
4. **Path aliases** (`@/components/...`, `@shared/...`)
5. **Error handling**: ทุก async function ต้องมี try/catch หรือ error boundary
6. **Naming**:
   - Components: PascalCase
   - Files: kebab-case (สำหรับ utility) / PascalCase (สำหรับ component file)
   - Functions: camelCase
   - Constants: UPPER_SNAKE_CASE
7. **Comments**: ภาษาอังกฤษสำหรับ code comments, ภาษาไทยได้ใน user-facing strings
8. **Git commit**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

---

## ⚠️ ข้อควรระวัง

1. **ห้าม hardcode credentials** — ทุกอย่างต้องอยู่ใน `.env`
2. **ห้าม expose API key ฝั่ง frontend** — ใช้ public anon key ของ Supabase เท่านั้น
3. **RLS policies ต้องตั้ง** — Supabase Row Level Security ทุก table
4. **Stock adjustment ต้องเป็น transaction** — ใช้ Prisma `$transaction` ป้องกัน race condition
5. **Date handling** — เก็บเป็น UTC ใน DB, แสดงเป็น Asia/Bangkok ที่ UI
6. **File upload** — validate size และ mime type ก่อน upload ไป Supabase Storage
7. **Soft delete** — ไม่ลบจริงใน DB (ใช้ `isActive` หรือ `deletedAt`)

---

## 🎬 คำสั่งเริ่มต้นสำหรับ Claude Code

**Step 1:** ให้ Claude Code อ่าน prompt นี้ทั้งหมดก่อน

```
อ่าน PROMPT.md ทั้งไฟล์ แล้วสรุปให้ฉันฟังว่าจะทำอะไรใน Phase 1 บ้าง
ก่อนเริ่มเขียนโค้ด
```

**Step 2:** เริ่ม Phase 1

```
เริ่ม Phase 1: Setup & Infrastructure
- สร้าง monorepo structure ตามที่กำหนด
- ใช้ pnpm workspaces
- ติดตั้ง dependencies ที่จำเป็นทั้ง frontend และ backend
- setup config files ทั้งหมด (tsconfig, vite.config, tailwind.config, .eslintrc, .prettierrc)
- สร้าง Prisma schema ตาม schema ที่ให้มา
- สร้าง migration แรก
- รัน build check ให้ผ่านก่อนไป phase ต่อไป
```

**Step 3:** ให้ Claude Code report ทุก phase

```
หลังจบแต่ละ phase ให้ report:
1. ทำอะไรไปบ้าง
2. ติดปัญหาอะไร แก้ยังไง
3. Phase ต่อไปคืออะไร
```

---

## 📎 ไฟล์ที่แนบมาด้วย

1. `schema-reference.md` — รายละเอียด schema + sample data จาก Excel
2. `excel-data-sample.md` — ตัวอย่างข้อมูลจริงจากไฟล์ที่ต้อง import
3. `api-contracts.md` — ตัวอย่าง request/response body ของแต่ละ endpoint

---

**พร้อมเริ่มลุยแล้วครับ! 🚀**
