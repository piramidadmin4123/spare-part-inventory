# คู่มือ Handover — Spare Part Inventory

เอกสารส่งมอบระบบ: วิธีรันบนเครื่อง (localhost), การเตรียม deploy บน VM, และรายการบริการ/ลิงก์ที่ระบบใช้งานอยู่

> ค่าที่เป็นความลับ (รหัสผ่าน / secret key) **ไม่ได้ใส่ไว้ในไฟล์นี้** เพื่อความปลอดภัย — ดูได้จาก Vercel / Neon / Supabase dashboard หรือช่องว่าง `__________` ให้กรอกเอง

---

## 1. ภาพรวมระบบ

- **โครงสร้าง:** Monorepo (pnpm workspace)
  - `apps/api` — Backend (Express + Prisma + TypeScript)
  - `apps/web` — Frontend (React + Vite + TypeScript + Tailwind)
  - `packages/shared` — โค้ด/Schema (zod) ที่ใช้ร่วมกันทั้ง 2 ฝั่ง
- **ฐานข้อมูล:** PostgreSQL (Neon)
- **Auth:** JWT + Microsoft 365 SSO (Azure AD)
- **ไฟล์รูป:** Supabase Storage (bucket)
- **แจ้งเตือน:** Email (SMTP / Gmail) + Microsoft Teams webhook
- **Deploy ปัจจุบัน:** Vercel (web + api แยกโปรเจกต์) + Neon (DB) + Vercel Cron

---

## 2. บริการ / ลิงก์ที่ใช้อยู่ตอนนี้

> ทุกบริการ login ผ่าน **GitHub** บัญชี `piramidadmin4123` (อีเมล `piramidadmin4123@gmail.com`)
> รหัสผ่าน GitHub / 2FA: `__________`

| บริการ                 | ใช้ทำอะไร               | ลิงก์ / ค่า                                                                          | หมายเหตุ login                                                                                       |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **GitHub (repo)**      | source code             | https://github.com/piramidadmin4123/spare-part-inventory                             | บัญชี piramidadmin4123                                                                               |
| **Vercel**             | host web + api + cron   | https://vercel.com/dashboard                                                         | login with GitHub                                                                                    |
| → Web (production)     | หน้าเว็บผู้ใช้          | https://spare-part-inventory-web.vercel.app                                          |                                                                                                      |
| → API (production)     | backend API             | `__________` (Vercel project URL ของ api)                                            |                                                                                                      |
| **Neon**               | PostgreSQL database     | https://console.neon.tech                                                            | login with GitHub · region ap-southeast-1                                                            |
| **Supabase**           | เก็บรูป (Storage) + key | https://knmchdgzgnawhqhjwits.supabase.co · dashboard: https://supabase.com/dashboard | login with GitHub (`__________` ถ้าใช้บัญชีอื่น)                                                     |
| **Microsoft Azure AD** | O365 SSO (login)        | https://portal.azure.com → App registrations                                         | Client ID: `66758b2e-63c2-4473-a1fc-ade009a56da5` · Tenant: `common` · บัญชี Azure: `__________`     |
| **Microsoft Teams**    | webhook แจ้งเตือน       | Incoming Webhook ในช่อง Teams                                                        | URL อยู่ใน env `TEAMS_WEBHOOK_URL` (Vercel)                                                          |
| **Gmail (SMTP)**       | ส่งอีเมลแจ้งเตือน       | smtp.gmail.com:587 · บัญชี `piramidadmin4123@gmail.com`                              | ใช้ **App Password** (ไม่ใช่รหัสผ่านปกติ) — สร้างที่ myaccount.google.com → Security → App passwords |

> ⚠️ ตอนส่งมอบ App Password ของ Gmail หมดอายุ/ถูก revoke — ผู้รับมอบต้องสร้างใหม่แล้วอัปเดต `SMTP_PASS` ทั้งใน `.env` และ Vercel

---

## 3. สิ่งที่ต้องลงในเครื่อง (Prerequisites)

| โปรแกรม                    | เวอร์ชัน                    | ลิงก์                              |
| -------------------------- | --------------------------- | ---------------------------------- |
| **Node.js**                | ≥ 20 (แนะนำ 20 LTS หรือ 22) | https://nodejs.org                 |
| **pnpm**                   | ≥ 9 (ใช้อยู่ 9.15.9)        | `npm install -g pnpm`              |
| **Git**                    | ล่าสุด                      | https://git-scm.com                |
| (ไม่บังคับ) **PostgreSQL** | 15+                         | เฉพาะถ้าจะรัน DB ในเครื่องแทน Neon |

> ไม่จำเป็นต้องลง Postgres ในเครื่องถ้าใช้ Neon (cloud) — แค่มี `DATABASE_URL` ก็พอ

---

## 4. วิธีรันบน localhost (ทีละขั้น)

```bash
# 1) clone โปรเจกต์
git clone https://github.com/piramidadmin4123/spare-part-inventory.git
cd spare-part-inventory

# 2) ติดตั้ง dependencies ทั้ง monorepo
pnpm install

# 3) ตั้งค่า environment (ดูหัวข้อ 5)
#    - สร้าง apps/api/.env
#    - สร้าง apps/web/.env

# 4) generate Prisma client + sync schema เข้า DB
pnpm --filter @spare-part/api db:generate
pnpm --filter @spare-part/api db:push      # หรือ prisma migrate deploy ถ้าต้องการใช้ migration

# 5) (ครั้งแรก / ถ้าต้องการข้อมูลตัวอย่าง) seed ข้อมูล
pnpm --filter @spare-part/api db:seed

# 6) รัน dev ทั้ง web + api พร้อมกัน
pnpm dev
```

เปิดเว็บ:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001 (health check: http://localhost:3001/health)

> บัญชีผู้ดูแล/ทดสอบเริ่มต้น (ถ้ามีจาก seed): `__________`

---

## 5. Environment Variables

### 5.1 `apps/api/.env` (Backend)

| ตัวแปร                      | ค่า / คำอธิบาย                                         | ความลับ?                                            |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`              | Neon **pooler** connection (รันจริง)                   | 🔒 `__________` (ดูใน Neon / Vercel)                |
| `DIRECT_URL`                | Neon **direct** connection (ใช้ migrate)               | 🔒 `__________`                                     |
| `SUPABASE_URL`              | `https://knmchdgzgnawhqhjwits.supabase.co`             | ไม่ลับ                                              |
| `SUPABASE_ANON_KEY`         | `sb_publishable_oGWBG5u9HfyZL_2V1zu34Q_CZaQk5WR`       | ไม่ลับ (publishable)                                |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (สิทธิ์สูง)                           | 🔒 `__________` (Supabase → Project Settings → API) |
| `JWT_SECRET`                | คีย์เซ็น JWT (อย่างน้อย 32 ตัวอักษร)                   | 🔒 `__________`                                     |
| `JWT_EXPIRES_IN`            | `7d`                                                   | ไม่ลับ                                              |
| `PORT`                      | `3001`                                                 | ไม่ลับ                                              |
| `NODE_ENV`                  | `development` (local) / `production` (prod)            | ไม่ลับ                                              |
| `CORS_ORIGIN`               | `http://localhost:5173` (local) / โดเมนเว็บจริง (prod) | ไม่ลับ                                              |
| `SUPABASE_STORAGE_BUCKET`   | `spare-parts-images`                                   | ไม่ลับ                                              |
| `AZURE_CLIENT_ID`           | `66758b2e-63c2-4473-a1fc-ade009a56da5`                 | ไม่ลับ                                              |
| `AZURE_TENANT_ID`           | `common`                                               | ไม่ลับ                                              |
| `TEAMS_WEBHOOK_URL`         | URL webhook ของ Teams                                  | 🔒 `__________` (Vercel env)                        |
| `SMTP_HOST`                 | `smtp.gmail.com`                                       | ไม่ลับ                                              |
| `SMTP_PORT`                 | `587`                                                  | ไม่ลับ                                              |
| `SMTP_USER`                 | `piramidadmin4123@gmail.com`                           | ไม่ลับ                                              |
| `SMTP_PASS`                 | Gmail **App Password** (16 ตัว)                        | 🔒 `__________` (สร้างใหม่)                         |
| `SMTP_FROM`                 | (ไม่ใส่ก็ได้ — default = SMTP_USER)                    | ไม่ลับ                                              |
| `NOTIFY_EMAILS`             | อีเมลรับแจ้งเตือนเพิ่ม คั่นด้วย comma (เว้นว่างได้)    | ไม่ลับ                                              |
| `APP_URL`                   | `http://localhost:5173` (local) / โดเมนเว็บจริง (prod) | ไม่ลับ                                              |

### 5.2 `apps/web/.env` (Frontend) — ตัวแปรขึ้นต้น `VITE_`

| ตัวแปร                   | ค่า / คำอธิบาย                                            |
| ------------------------ | --------------------------------------------------------- |
| `VITE_API_URL`           | `http://localhost:3001` (local) / URL ของ api prod (prod) |
| `VITE_AZURE_CLIENT_ID`   | `66758b2e-63c2-4473-a1fc-ade009a56da5`                    |
| `VITE_AZURE_TENANT_ID`   | `common`                                                  |
| `VITE_SUPABASE_URL`      | `https://knmchdgzgnawhqhjwits.supabase.co`                |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_oGWBG5u9HfyZL_2V1zu34Q_CZaQk5WR`          |

> ค่าจริงทั้งหมดของ production ดูได้ที่ **Vercel → (แต่ละ project) → Settings → Environment Variables**

---

## 6. การ Deploy

### 6.1 แบบปัจจุบัน — Vercel (cloud)

- มี **2 Vercel projects**: หนึ่งสำหรับ `apps/web` หนึ่งสำหรับ `apps/api`
- Push ขึ้น branch `main` ของ GitHub → Vercel auto-deploy
- **API** (`apps/api/vercel.json`): build ด้วย `node scripts/bundle.mjs` (script `vercel-build`) → serverless function + **Cron** ยิง `/api/cron` ทุกวันตี 1
- **Web** (`apps/web/vercel.json`): SPA rewrite ทุก path → `index.html`
- อย่าลืมตั้ง **Environment Variables** ในแต่ละ project ให้ครบ (หัวข้อ 5)

### 6.2 แบบ Self-host บน VM (เตรียมการ)

แนวทางรันเองบนเครื่อง VM (เช่น Ubuntu) — _ปรับตามจริงได้_

**ก. เตรียมเครื่อง VM**

```bash
# ติดตั้ง Node 20 LTS, pnpm, git, nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo npm install -g pnpm pm2
```

**ข. DB** — เลือกอย่างใดอย่างหนึ่ง

- ใช้ **Neon** ต่อ (ง่ายสุด — แค่ใช้ `DATABASE_URL` เดิม) หรือ
- ติดตั้ง **PostgreSQL บน VM** เอง แล้วเปลี่ยน `DATABASE_URL` / `DIRECT_URL` ให้ชี้มาที่เครื่อง

**ค. ดึงโค้ด + build**

```bash
git clone https://github.com/piramidadmin4123/spare-part-inventory.git
cd spare-part-inventory
pnpm install
# ตั้ง apps/api/.env และ apps/web/.env (NODE_ENV=production, CORS_ORIGIN/APP_URL/VITE_API_URL = โดเมนจริง)
pnpm --filter @spare-part/api db:generate
pnpm --filter @spare-part/api exec prisma migrate deploy   # apply schema
pnpm build                                                  # build web + api
```

**ง. รัน**

```bash
# API (Express) — รันด้วย pm2
pnpm --filter @spare-part/api exec node dist/src/server.js   # ทดสอบก่อน
pm2 start "node apps/api/dist/src/server.js" --name spare-api

# Web — เป็น static build (apps/web/dist) ให้ nginx เสิร์ฟ
#   หรือใช้ `pnpm --filter @spare-part/web preview` สำหรับทดสอบ
```

**จ. Nginx (reverse proxy ตัวอย่าง)**

```nginx
server {
  server_name __________;                 # โดเมน เช่น spare.example.com
  root /path/to/spare-part-inventory/apps/web/dist;   # static ของ web
  location / { try_files $uri /index.html; }          # SPA
  location /api/ { proxy_pass http://localhost:3001;  # ส่งต่อ API
                   proxy_set_header Host $host; }
}
```

**ฉ. Cron (แทน Vercel Cron)** — งานแจ้งเตือนกำหนดคืน

- บน Vercel ใช้ `/api/cron` (ตั้งใน `apps/api/vercel.json`)
- บน VM: ตัว `apps/api/src/lib/scheduler.ts` มี node-cron ในตัว (ยิง 08:00 ทุกวัน) ทำงานเมื่อ server รันค้างไว้ด้วย pm2 — ไม่ต้องตั้ง cron เพิ่ม

> สิ่งที่ต้องเตรียมเพิ่มสำหรับ VM: โดเมน `__________`, SSL (เช่น certbot/Let's Encrypt), firewall เปิด port 80/443

---

## 7. คำสั่งที่ใช้บ่อย

| คำสั่ง                                                     | ทำอะไร                                 |
| ---------------------------------------------------------- | -------------------------------------- |
| `pnpm dev`                                                 | รัน web + api (dev) พร้อมกัน           |
| `pnpm build`                                               | build ทั้งหมด                          |
| `pnpm --filter @spare-part/api dev`                        | รันเฉพาะ api                           |
| `pnpm --filter @spare-part/web dev`                        | รันเฉพาะ web                           |
| `pnpm --filter @spare-part/api db:studio`                  | เปิด Prisma Studio (ดู/แก้ข้อมูลใน DB) |
| `pnpm --filter @spare-part/api db:push`                    | sync schema → DB (ไม่สร้าง migration)  |
| `pnpm --filter @spare-part/api exec prisma migrate deploy` | apply migrations (prod)                |
| `pnpm --filter @spare-part/api db:seed`                    | ใส่ข้อมูลตัวอย่าง                      |
| `pnpm lint` / `pnpm format`                                | ตรวจ/จัดรูปแบบโค้ด                     |

---

## 8. ช่องให้กรอกเพิ่มเอง (Checklist ส่งมอบ)

- [ ] รหัสผ่าน / 2FA ของ GitHub `piramidadmin4123`: `__________`
- [ ] URL ของ Vercel API project: `__________`
- [ ] ค่า `DATABASE_URL` / `DIRECT_URL` (Neon): `__________`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: `__________`
- [ ] `JWT_SECRET` (prod): `__________`
- [ ] `TEAMS_WEBHOOK_URL`: `__________`
- [ ] Gmail **App Password** ใหม่ (`SMTP_PASS`): `__________`
- [ ] บัญชี/สิทธิ์ Azure AD ที่ดูแล App registration: `__________`
- [ ] บัญชี Supabase (ถ้าไม่ได้ใช้ GitHub): `__________`
- [ ] โดเมน + SSL สำหรับ VM (ถ้า self-host): `__________`
- [ ] บัญชีผู้ดูแลระบบเริ่มต้น (admin login): `__________`

---

_อัปเดตล่าสุด: 2026-06-05_
