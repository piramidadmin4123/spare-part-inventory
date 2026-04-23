# 🔌 API Contracts — ตัวอย่าง Request/Response

ใช้เป็น reference สำหรับการ implement API endpoints และ frontend type definitions

---

## Auth

### POST /api/auth/login

**Request:**

```json
{
  "email": "admin@pyramidsolution.com",
  "password": "password123"
}
```

**Response 200:**

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@pyramidsolution.com",
    "name": "Admin User",
    "role": "ADMIN"
  },
  "accessToken": "eyJhbGc..."
}
```

**Response 401:**

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Email or password is incorrect"
}
```

---

## Spare Parts

### GET /api/spare-parts

**Query params:**

- `siteId?: string`
- `equipmentTypeId?: string`
- `brandId?: string`
- `status?: ItemStatus`
- `search?: string` (matches modelCode, serialNumber, productName)
- `page?: number` (default 1)
- `limit?: number` (default 20)
- `sortBy?: string` (default 'createdAt')
- `sortOrder?: 'asc' | 'desc'` (default 'desc')

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "site": { "id": "uuid", "code": "BKK", "name": "Bangkok HQ" },
      "equipmentType": { "id": "uuid", "code": "AP-R", "category": "Access Point" },
      "brand": { "id": "uuid", "name": "Ruckus" },
      "materialCode": "ONWS0052000001",
      "modelCode": "901-R610-WW00",
      "productName": "RUCKUS R610 DUAL-BAND...",
      "serialNumber": "331849004133",
      "macAddress": null,
      "quantity": 1,
      "minStock": 1,
      "cost": "19795.00",
      "status": "IN_STOCK",
      "location": "ห้อง PJ",
      "remark": "ห้องพี่ตุ๊ก",
      "imageUrl": null,
      "currentBorrow": null,
      "createdAt": "2026-04-17T09:00:00Z",
      "updatedAt": "2026-04-17T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

### POST /api/spare-parts

**Request:**

```json
{
  "siteId": "uuid",
  "equipmentTypeId": "uuid",
  "brandId": "uuid",
  "materialCode": "ONWS0052000001",
  "modelCode": "901-R610-WW00",
  "productName": "RUCKUS R610...",
  "serialNumber": "331849004133",
  "macAddress": null,
  "quantity": 1,
  "minStock": 1,
  "cost": 19795.0,
  "status": "IN_STOCK",
  "location": "ห้อง PJ",
  "remark": ""
}
```

**Response 201:** (เหมือน GET)

**Response 400:**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input",
  "issues": [{ "path": "serialNumber", "message": "Serial number already exists" }]
}
```

---

## Borrow Transactions

### POST /api/borrow (Technician create)

**Request:**

```json
{
  "sparePartId": "uuid",
  "project": "Capella Hotel Migration",
  "dateStart": "2026-04-20",
  "expectedReturn": "2026-05-20",
  "borrowerRemark": "ใช้สำหรับ migrate AP ที่ site Capella"
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "sparePart": { "id": "uuid", "modelCode": "901-R610-WW00" },
  "borrower": { "id": "uuid", "name": "AZN" },
  "approver": null,
  "status": "PENDING",
  "project": "Capella Hotel Migration",
  "dateStart": "2026-04-20T00:00:00Z",
  "expectedReturn": "2026-05-20T00:00:00Z",
  "borrowerRemark": "...",
  "createdAt": "2026-04-17T09:00:00Z"
}
```

### PATCH /api/borrow/:id/approve (Manager)

**Request:**

```json
{
  "approverRemark": "อนุมัติ ระวังใช้ด้วย"
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "status": "APPROVED",
  "approver": { "id": "uuid", "name": "Manager Somchai" },
  "approverRemark": "อนุมัติ ระวังใช้ด้วย",
  "updatedAt": "2026-04-17T10:00:00Z"
}
```

**Side effects (atomic ใน transaction):**

1. `BorrowTransaction.status = 'APPROVED'`
2. `SparePart.status = 'BORROWED'` (หรือ quantity -= 1 ถ้าเป็น bulk items)
3. Create `AuditLog` entry
4. Trigger notification (LINE/Email) ไปหา borrower

### PATCH /api/borrow/:id/return

**Request:**

```json
{
  "actualReturn": "2026-05-15",
  "borrowerRemark": "คืนเรียบร้อย สภาพดี"
}
```

**Side effects:**

1. `BorrowTransaction.status = 'RETURNED'`
2. `BorrowTransaction.actualReturn = now()`
3. `SparePart.status = 'IN_STOCK'` (หรือ quantity += 1)
4. Create `AuditLog` entry

### Overdue Use Case (Borrow / Return page)

**Actor:** Borrower / Manager

**Preconditions:**

- `status = "APPROVED"`
- `expectedReturn` มีค่า
- current datetime มากกว่า `expectedReturn`

**Main flow:**

1. ผู้ใช้เปิดหน้า `ยืม / คืน`
2. ระบบเปรียบเทียบ current datetime กับ `expectedReturn`
3. ถ้าเลยกำหนด ระบบแสดง tag สีแดง `เกินกำหนด` ข้างสถานะ
4. รายการยังสามารถกดคืนได้ตามสิทธิ์ปกติ

**Result:**

- ไม่มีการเปลี่ยนสถานะในฐานข้อมูลเพียงเพราะ overdue
- overdue เป็นสถานะที่คำนวณจากเวลาแบบ dynamic ตอนแสดงผล

---

## Dashboard Summary

### GET /api/dashboard/summary

**Response 200:**

```json
{
  "totalItems": 145,
  "presentItems": 85,
  "needItems": 60,
  "activeBorrows": 33,
  "pendingApprovals": 5,
  "overdueBorrowers": 4,
  "lowStockCount": 3,

  "byCategory": [
    { "category": "Access Point", "present": 9, "need": 10, "total": 19 },
    { "category": "Switch", "present": 24, "need": 1, "total": 25 },
    { "category": "CCTV", "present": 13, "need": 7, "total": 20 },
    { "category": "Firewall", "present": 0, "need": 4, "total": 4 },
    { "category": "Network", "present": 39, "need": 28, "total": 67 }
  ],

  "bySite": [
    { "siteCode": "BKK", "siteName": "Bangkok HQ", "count": 85 },
    { "siteCode": "KIS", "siteName": "KIS", "count": 24 },
    { "siteCode": "REIGNWOOD_CUR", "siteName": "Reignwood", "count": 18 },
    { "siteCode": "TEACHER_DORM", "siteName": "Teacher Dormitory", "count": 15 },
    { "siteCode": "PKT", "siteName": "Phuket", "count": 3 }
  ],

  "byStatus": [
    { "status": "IN_SERVICE", "count": 78, "label": "กำลังใช้งาน" },
    { "status": "IN_STOCK", "count": 24, "label": "อยู่ในคลัง" },
    { "status": "BORROWED", "count": 33, "label": "ถูกยืม" },
    { "status": "MAINTENANCE", "count": 2, "label": "ซ่อม" }
  ]
}
```

### GET /api/dashboard/low-stock

**Response 200:**

```json
{
  "items": [
    {
      "id": "uuid",
      "modelCode": "UFP522D31-03",
      "productName": "LC - LC Patch cord OM2",
      "currentQuantity": 0,
      "minStock": 6,
      "deficit": 6,
      "brand": "Interlink"
    }
  ]
}
```

---

## Excel Import

### POST /api/excel/import

**Request:** `multipart/form-data`

- `file`: Excel file (.xlsx)
- `mode`: `"append"` | `"replace"` (default: append)
- `dryRun`: `boolean` (default: false) — ถ้า true จะ validate อย่างเดียว ไม่ insert

**Response 200:**

```json
{
  "success": true,
  "summary": {
    "totalRows": 145,
    "imported": 140,
    "skipped": 3,
    "failed": 2
  },
  "sheets": [
    {
      "name": "Spare Parts All",
      "imported": 78,
      "skipped": 2,
      "failed": 0
    }
  ],
  "errors": [
    {
      "sheet": "Spare Parts All",
      "row": 45,
      "reason": "Missing required field: modelCode",
      "rawData": { "Type": "AP-R", "Brand": "Ruckus" }
    }
  ],
  "warnings": [
    {
      "sheet": "Spare Parts KIS",
      "row": 12,
      "message": "Duplicate serial number, skipped"
    }
  ]
}
```

---

## Standard Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {
    /* optional */
  }
}
```

**Common error codes:**

- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403) — ไม่มีสิทธิ์ (role ไม่พอ)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `CONFLICT` (409) — เช่น serial number ซ้ำ
- `INSUFFICIENT_STOCK` (409) — ยืมไม่ได้เพราะของหมด
- `INTERNAL_ERROR` (500)

---

## Zod Schemas (shared)

```ts
// packages/shared/src/schemas/spare-part.ts
import { z } from 'zod';

export const createSparePartSchema = z.object({
  siteId: z.string().uuid(),
  equipmentTypeId: z.string().uuid(),
  brandId: z.string().uuid(),
  materialCode: z.string().max(50).optional().nullable(),
  modelCode: z.string().min(1).max(100),
  productName: z.string().min(1),
  serialNumber: z.string().max(100).optional().nullable(),
  macAddress: z
    .string()
    .regex(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i)
    .optional()
    .nullable(),
  quantity: z.number().int().min(0).default(1),
  minStock: z.number().int().min(0).default(1),
  cost: z.number().nonnegative().optional().nullable(),
  status: z.enum(['IN_SERVICE', 'BORROWED', 'IN_STOCK', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED']),
  location: z.string().max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});

export type CreateSparePartInput = z.infer<typeof createSparePartSchema>;

export const updateSparePartSchema = createSparePartSchema.partial();
export type UpdateSparePartInput = z.infer<typeof updateSparePartSchema>;

export const borrowRequestSchema = z.object({
  sparePartId: z.string().uuid(),
  project: z.string().min(1).max(200),
  dateStart: z.string().datetime(),
  expectedReturn: z.string().datetime().optional(),
  borrowerRemark: z.string().optional(),
});

export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;
```

---

## Authentication Headers

ทุก endpoint ยกเว้น `/api/auth/login` และ `/api/auth/register` ต้องมี:

```
Authorization: Bearer <JWT_TOKEN>
```

Backend middleware ตรวจสอบ token และใส่ `req.user` ให้ route handler

---

## RBAC (Role-Based Access Control)

| Endpoint                      | ADMIN | MANAGER | TECHNICIAN | VIEWER |
| ----------------------------- | :---: | :-----: | :--------: | :----: |
| GET /api/spare-parts          |   ✓   |    ✓    |     ✓      |   ✓    |
| POST /api/spare-parts         |   ✓   |    ✓    |     ✗      |   ✗    |
| PATCH /api/spare-parts/:id    |   ✓   |    ✓    |     ✗      |   ✗    |
| DELETE /api/spare-parts/:id   |   ✓   |    ✗    |     ✗      |   ✗    |
| POST /api/borrow              |   ✓   |    ✓    |     ✓      |   ✗    |
| PATCH /api/borrow/:id/approve |   ✓   |    ✓    |     ✗      |   ✗    |
| POST /api/excel/import        |   ✓   |    ✗    |     ✗      |   ✗    |
| GET /api/audit-logs           |   ✓   |    ✗    |     ✗      |   ✗    |

---

**พร้อมให้ Claude Code เริ่ม implement แล้ว!** 🚀
