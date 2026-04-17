# ⚡ QUICKSTART — สำหรับ Paste เข้า Claude Code

> ไฟล์นี้คือ prompt แบบสั้นที่สุด ที่สามารถ copy-paste ไปเริ่มต้นใน Claude Code ได้เลย
> ถ้าต้องการรายละเอียดเพิ่ม ให้ Claude Code อ่าน `PROMPT.md`, `schema-reference.md`, `api-contracts.md`

---

## 📝 Paste ข้อความนี้เข้า Claude Code:

```
ฉันต้องการสร้างระบบ Web Application ชื่อ "Inventory Spare Part Management System"
สำหรับแผนก Service ของบริษัท Pyramid Solution เพื่อแทนการใช้ไฟล์ Excel ในการจัดการอุปกรณ์

CONTEXT:
- ต้องรองรับ 5 site: BKK, REIGNWOOD (ปัจจุบัน+เก่า), KIS, TEACHER DORM, PKT
- อุปกรณ์: Access Point, Switch, CCTV, Firewall, Mini GBIC, Fiber, NVR, etc.
- ประมาณ 145 รายการ (85 มีอยู่ + 60 ที่ต้องสั่งเพิ่ม)
- มีฟีเจอร์หลัก: CRUD อุปกรณ์, Borrow/Return workflow (ต้อง approve), Excel import/export,
  Low stock alert, Multi-site view, Audit log, Role-based access

TECH STACK (กำหนดแน่นอน):
- Frontend: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
  + TanStack Query + Zustand + React Hook Form + Zod
- Backend: Node.js 20 + Express + TypeScript + Prisma
- Database: Supabase (PostgreSQL) + Supabase Auth (JWT) + Supabase Storage
- Monorepo: pnpm workspaces
- Deploy: Vercel (FE) + Railway/Render (BE)

STRUCTURE:
spare-part-inventory/
├── apps/web/      (frontend)
├── apps/api/      (backend + prisma)
├── packages/shared/ (Zod schemas + types ใช้ร่วม FE/BE)

ฉันมีไฟล์เอกสารแนบ:
1. PROMPT.md              — spec เต็ม (อ่านก่อนเริ่ม)
2. schema-reference.md    — Prisma schema + mapping จาก Excel
3. api-contracts.md       — ตัวอย่าง API request/response
4. Update_Spart_Part_R11_8-1-2026.xlsx — ไฟล์ Excel เดิม (ใช้ทดสอบ import)

GOAL ตอนนี้: เริ่ม Phase 1 เท่านั้น
1. อ่านไฟล์ PROMPT.md ทั้งหมด แล้วสรุปแผน phase 1 ให้ฉันฟังก่อน
2. รอ confirm จากฉัน แล้วค่อยเริ่มเขียนโค้ด
3. Phase 1 ครอบคลุม: init monorepo, setup tooling (ESLint, Prettier, TS configs),
   setup frontend boilerplate, setup backend boilerplate, สร้าง Prisma schema,
   สร้าง migration แรก, test ว่า build ผ่าน

อย่าเพิ่งเขียน business logic หรือ pages ใดๆ ใน phase นี้

RULES:
- TypeScript strict mode เปิด, ห้ามใช้ any
- ใช้ ES Modules
- ห้าม hardcode credentials
- Stock adjustment ต้องอยู่ใน Prisma transaction
- Soft delete (ไม่ลบจริง)
- Audit log ทุก mutation

เริ่มเลยครับ!
```

---

## 📁 ไฟล์ที่ต้องเอาเข้า Claude Code workspace

1. `PROMPT.md` — spec เต็ม
2. `schema-reference.md` — Prisma schema + Excel mapping
3. `api-contracts.md` — API contracts
4. `Update_Spart_Part_R11_8-1-2026__Present_.xlsx` — ไฟล์ Excel ต้นฉบับ (copy จากที่ให้พี่ๆ มา)

---

## 🔄 Workflow การใช้งาน Claude Code

### รอบแรก: Setup

1. เปิด Claude Code ใน folder โปรเจค
2. Paste ข้อความด้านบน
3. รอ Claude สรุปแผน Phase 1
4. Confirm → เริ่มเขียนโค้ด
5. ตรวจสอบว่า build ผ่าน และ migration รันได้

### รอบถัดไป: ทีละ Phase

```
ต่อ Phase 2: Auth & User Management
- เขียน API endpoints สำหรับ register, login, logout, me, profile
- เขียน middleware ตรวจสอบ JWT
- เขียน frontend pages: /login, /register
- เขียน ProtectedRoute component
- ทดสอบ flow ครบทั้ง login → access protected → logout

ให้ report ตอนเสร็จว่าทำอะไรไปบ้างและเจอปัญหาอะไร
```

### รอบต่อๆ ไป

```
ต่อ Phase 3: Master Data (Sites, Equipment Types, Brands)
ต่อ Phase 4: Spare Parts CRUD
ต่อ Phase 5: Borrow Workflow
ต่อ Phase 6: Excel Import/Export
ต่อ Phase 7: Dashboard
ต่อ Phase 8: Notifications
ต่อ Phase 9: Polish & UI
ต่อ Phase 10: Deploy
```

---

## 💡 Tips การใช้ Claude Code กับโปรเจคนี้

1. **แบ่ง phase ให้ชัด** — อย่าให้ Claude ทำทั้งโปรเจครวดเดียว มันจะลงลึกไม่พอและเกิด error
2. **บอกให้ test หลังแต่ละ feature** — `รันทดสอบด้วย curl/postman ให้ฉันดู`
3. **ใช้ git commit หลังจบ phase** — `commit with message "feat: Phase 2 complete - auth module"`
4. **ถ้า stuck** ให้ใช้คำสั่ง:
   - `ดู error log แล้วอธิบายสาเหตุ`
   - `check ว่า types match กันไหม`
   - `รัน prisma format และ validate`
5. **เมื่อเจอ Excel edge case** ให้บอก:
   - `เจอ row ที่ brand เป็น null ให้ handle ยังไง`
   - `แสดง sample data ที่จะ import ก่อน แล้วรอให้ฉัน confirm`

---

## 🚨 Common Pitfalls

### ❌ อย่าให้ Claude Code ทำแบบนี้

- ข้าม phase หรือทำ 2-3 phase พร้อมกัน
- ติดตั้ง dependency เกินความจำเป็น
- สร้าง mock data โดยไม่ถาม
- hardcode Supabase URL / key
- ใช้ `any` ใน TypeScript

### ✅ Best Practice

- ทำทีละ phase, commit แยก branch
- ขอ review จาก Claude: `review code ที่เขียนใน phase นี้ แล้วชี้จุดที่อาจมี bug`
- ทดสอบทุก endpoint ด้วย curl ก่อนไปต่อ
- สร้าง seed script สำหรับ test data แทน mock

---

## 📞 Debug Commands ที่มีประโยชน์

```bash
# Prisma
pnpm prisma migrate dev --name <change_description>
pnpm prisma studio              # GUI view database
pnpm prisma db seed
pnpm prisma generate

# Dev servers
pnpm --filter web dev           # frontend
pnpm --filter api dev           # backend

# Build check
pnpm --filter web build
pnpm --filter api build
pnpm -r build                   # build ทุก workspace

# Test API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test1234"}'
```

---

**พร้อมลุยแล้ว! Copy ข้อความในกรอบ code ด้านบน ไปวางใน Claude Code ได้เลยครับ** 🚀
