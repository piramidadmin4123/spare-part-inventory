# 📊 Schema Reference & Excel Data Mapping

## Excel File Structure (เดิม)

ไฟล์ Excel เดิมมี 8 sheet:

| Sheet                          | Rows | Purpose              |
| ------------------------------ | ---- | -------------------- |
| Summary                        | 28   | สรุปจำนวนรวม         |
| Spare Parts All                | 125  | รายการหลัก BKK       |
| Spare Parts REIGNWOOD ปัจจุบัน | 32   | Site REIGNWOOD ใหม่  |
| Spare Parts REIGNWOOD (เก่า)   | 26   | Site REIGNWOOD เก่า  |
| Spare Parts KIS                | 103  | Site KIS             |
| Spare Parts TEACHER DORM       | 103  | Site TEACHER DORM    |
| Additional Order BKK           | 46   | รายการรอสั่งซื้อ BKK |
| Additional Order PKT           | 43   | รายการรอสั่งซื้อ PKT |

---

## Column Mapping (Excel → Database)

### Spare Parts sheets (BKK, KIS, TEACHER DORM)

| Excel Column  | DB Field           | Type    | Required | Note                          |
| ------------- | ------------------ | ------- | -------- | ----------------------------- |
| No            | -                  | -       | -        | Skip (auto index)             |
| Type          | equipmentType.code | string  | ✓        | Map ไป EquipmentType table    |
| Brand         | brand.name         | string  | ✓        | Map ไป Brand table            |
| Material Code | materialCode       | string  | ✗        | เช่น ONWS005C500001           |
| Code (Model)  | modelCode          | string  | ✓        | เช่น IAP-103-RW               |
| PRODUCT NAME  | productName        | text    | ✓        | Full description              |
| Qty           | quantity           | int     | ✓        | Default 1                     |
| Cost (Total)  | cost               | decimal | ✗        |                               |
| Status        | status             | enum    | ✓        | Map ไป ItemStatus             |
| Serial Number | serialNumber       | string  | ✗        | Unique                        |
| Remark        | remark             | text    | ✗        |                               |
| Name          | borrower.name      | string  | ✗        | สร้าง BorrowTransaction ถ้ามี |
| Date Start    | borrowTx.dateStart | date    | ✗        |                               |
| Date End      | borrowTx.dateEnd   | date    | ✗        |                               |
| Project       | borrowTx.project   | string  | ✗        |                               |

### Spare Parts REIGNWOOD (มี column เพิ่ม)

| Extra Column | DB Field   | Note                     |
| ------------ | ---------- | ------------------------ |
| MAC ADDRESS  | macAddress | เฉพาะ REIGNWOOD เท่านั้น |

### Additional Order sheets

| Excel Column | DB Field    | Note               |
| ------------ | ----------- | ------------------ |
| Type         | type        |                    |
| Brand        | brand.name  |                    |
| Code         | modelCode   |                    |
| PRODUCT NAME | productName |                    |
| Qty          | quantity    |                    |
| Cost (Total) | unitCost    |                    |
| Status       | status      | "Additional Order" |
| Total Cost   | totalCost   |                    |
| Remark       | remark      |                    |

---

## Status Mapping (Excel → Enum)

```ts
const STATUS_MAP: Record<string, ItemStatus> = {
  'In Service': 'IN_SERVICE',
  'In Service SMI': 'IN_SERVICE',
  'Service BKK': 'IN_STOCK',
  'Service PKT': 'IN_STOCK',
  'Service SMI': 'IN_STOCK',
  onsite: 'IN_SERVICE',
  'ห้อง PJ': 'IN_STOCK',
  'ห้อง BD': 'IN_STOCK',
  สมุย: 'IN_SERVICE',
  // Additional
  'Additional Oder': 'PENDING', // typo ในไฟล์ต้นฉบับ
  'Additional Order': 'PENDING',
};

// location field เก็บค่าเดิมจาก Excel
// เพื่อไม่สูญเสียข้อมูล (เช่น "ห้อง PJ", "สมุย")
```

---

## Equipment Type Mapping

```ts
const TYPE_MAP = [
  { code: 'AP-A', category: 'Access Point', name: 'Access Point (Aruba)' },
  { code: 'AP-C', category: 'Access Point', name: 'Access Point (Cisco)' },
  { code: 'AP-R', category: 'Access Point', name: 'Access Point (Ruckus)' },
  { code: 'AP', category: 'Access Point', name: 'Access Point (Generic)' },
  { code: 'CCTV Dome', category: 'CCTV', name: 'CCTV (Dome)' },
  { code: 'CCTV Bullet', category: 'CCTV', name: 'CCTV (Bullet)' },
  { code: 'NVR', category: 'CCTV', name: 'Network Video Recorder' },
  { code: 'Switch8', category: 'Switch', name: 'Switch 8 Port (Non-POE)' },
  { code: 'Switch8 POE', category: 'Switch', name: 'Switch 8 Port (POE)' },
  { code: 'Switch12', category: 'Switch', name: 'Switch 12 Port' },
  { code: 'Switch24', category: 'Switch', name: 'Switch 24 Port (Non-POE)' },
  { code: 'Switch24 POE', category: 'Switch', name: 'Switch 24 Port (POE)' },
  { code: 'Switch48', category: 'Switch', name: 'Switch 48 Port (Non-POE)' },
  { code: 'Switch48 POE', category: 'Switch', name: 'Switch 48 Port (POE)' },
  { code: 'FW', category: 'Firewall', name: 'Firewall' },
  { code: 'Mini Gbic', category: 'Network', name: 'Mini GBIC SFP' },
  { code: 'Fiber', category: 'Network', name: 'Fiber Cable' },
  { code: 'Media Converter', category: 'Network', name: 'Media Converter' },
  { code: 'Adaptor', category: 'Accessory', name: 'Power Adaptor' },
  { code: 'Controller', category: 'Network', name: 'Wireless Controller' },
  { code: 'HDD', category: 'Storage', name: 'Hard Disk Drive' },
  { code: 'Router / Firewall', category: 'Firewall', name: 'Router/Firewall' },
];
```

---

## Brand Seed Data

```ts
const BRANDS = [
  'Aruba',
  'Cisco',
  'Ruckus',
  'Huawei',
  'Ruijie',
  'Hikvision',
  'Wisenet',
  'Dahua',
  'BOSCH',
  'Fortinet',
  'Mikrotik',
  'HP',
  'HPE',
  'TP-Link',
  'Ubiquiti',
  'ALLIED TELESIS',
  'Interlink',
  'WD',
];
```

---

## Site Seed Data

```ts
const SITES = [
  { code: 'BKK', name: 'Bangkok HQ', description: 'Main office in Bangkok' },
  { code: 'REIGNWOOD_CUR', name: 'Reignwood (ปัจจุบัน)', description: 'Current Reignwood site' },
  { code: 'REIGNWOOD_OLD', name: 'Reignwood (เก่า)', description: 'Legacy Reignwood site' },
  { code: 'KIS', name: 'KIS', description: 'KIS site' },
  { code: 'TEACHER_DORM', name: 'Teacher Dormitory', description: 'Teacher Dormitory site' },
  { code: 'PKT', name: 'Phuket', description: 'Phuket site' },
  { code: 'SMI', name: 'Samui', description: 'Samui site' },
];
```

---

## Sample Data จริง (สำหรับ Testing)

### ตัวอย่าง SparePart ที่พบในไฟล์

```json
{
  "site": "BKK",
  "equipmentType": "AP-R",
  "brand": "Ruckus",
  "materialCode": "ONWS0052000001",
  "modelCode": "901-R610-WW00",
  "productName": "RUCKUS R610 DUAL-BAND 802.11ABGN/AC (802.11AC WAVE 2) WIRELESS ACCESS POINT, 3X3:3 STREAMS, MU-MIMO, BEAMFLEX+, DUAL PORTS, 802.3AF/AT POE SUPPORT",
  "serialNumber": "331849004133",
  "quantity": 1,
  "cost": 19795.0,
  "status": "IN_STOCK",
  "location": "ห้อง PJ",
  "remark": "ห้องพี่ตุ๊ก"
}
```

### ตัวอย่างรายการที่ถูกยืม

```json
{
  "sparePart": {
    "equipmentType": "CCTV Dome",
    "brand": "Hikvision",
    "modelCode": "DS-2CD1323G0-IUF(2.8mm)(C)",
    "serialNumber": "J86864498"
  },
  "borrowTransaction": {
    "borrowerName": "capella (project)",
    "dateStart": "2025-02-19",
    "status": "APPROVED"
  },
  "remark": "capella ยืม"
}
```

### ตัวอย่าง REIGNWOOD ที่มี MAC Address

```json
{
  "site": "REIGNWOOD_CUR",
  "equipmentType": "CCTV Bullet",
  "brand": "Hikvision",
  "modelCode": "DS-2CD3666G2T-IZS 2.7-13.5mm (H)",
  "serialNumber": "FW2334409",
  "macAddress": "54-8C-81-F5-F3-22",
  "status": "IN_SERVICE",
  "remark": "ยังไม่ลงระบบ",
  "borrowTransaction": {
    "borrowerName": "Prem",
    "dateStart": "2025-10-08",
    "project": "แทน BIK-18"
  }
}
```

### ตัวอย่าง Additional Order

```json
{
  "site": "BKK",
  "type": "FW",
  "brand": "Fortinet",
  "productName": "Fortinet FortiGate 100D",
  "quantity": 1,
  "unitCost": 20000.0,
  "totalCost": 20000.0,
  "status": "PENDING",
  "remark": "ของมือสอง"
}
```

---

## Summary ที่คำนวณได้

- **Total Present** (มีของจริง): 85 ชิ้น
- **Total Need** (ต้องสั่งเพิ่ม): 60 ชิ้น
- **Grand Total**: 145 ชิ้น

**By Category (Present):**

- Access Point (Aruba): 2
- Access Point (Ruckus): 7
- Switch 24 Port (Non-POE): 12
- Switch 24 Port (POE): 8
- CCTV Dome: 13
- Mini GBIC: 39
- อื่นๆ: 4

---

## Excel Import Logic Pseudocode

```typescript
async function importExcel(file: Buffer) {
  const workbook = XLSX.read(file);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const siteCode = detectSiteFromSheetName(sheetName);

    if (sheetName.startsWith('Spare Parts')) {
      await importSpareParts(sheet, siteCode);
    } else if (sheetName.startsWith('Additional Order')) {
      await importAdditionalOrders(sheet, siteCode);
    }
    // skip Summary sheet
  }
}

async function importSpareParts(sheet, siteCode) {
  const rows = XLSX.utils.sheet_to_json(sheet, { range: 6 }); // header ที่ row 7

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      // 1. หรือสร้าง equipment type
      const equipmentType = await upsertEquipmentType(tx, row['Type']);

      // 2. หรือสร้าง brand
      const brand = await upsertBrand(tx, row['Brand']);

      // 3. สร้าง spare part
      const sparePart = await tx.sparePart.create({
        data: {
          siteId: site.id,
          equipmentTypeId: equipmentType.id,
          brandId: brand.id,
          materialCode: row['Material Code'],
          modelCode: row['Code (Model)'] || row['Code'],
          productName: row['PRODUCT NAME'],
          serialNumber: row['Serail Number'], // typo ในต้นฉบับ
          macAddress: row['MAC ADDRESS'],
          quantity: row['Qty'] || 1,
          cost: row['Cost (Total)'],
          status: mapStatus(row['Status']),
          location: row['Status'], // เก็บค่าเดิม
          remark: row['Remark'],
        },
      });

      // 4. ถ้ามี borrower → สร้าง BorrowTransaction
      if (row['Name']) {
        await tx.borrowTransaction.create({
          data: {
            sparePartId: sparePart.id,
            borrowerName: row['Name'], // อาจต้อง create user ใหม่
            status: 'APPROVED',
            dateStart: parseDate(row['Date Start']),
            dateEnd: parseDate(row['Date End']),
            project: row['Project'],
          },
        });
      }
    }
  });
}
```

---

## ⚠️ Data Quality Issues ที่พบในไฟล์

1. **Typo:** "Serail Number" (ควรเป็น Serial Number) — import logic ต้องอ่านทั้ง 2 แบบ
2. **Typo:** "Additional Oder" (ควรเป็น Order)
3. **Inconsistent brand names:** "Aruba" กับ "ARUBA" (case-insensitive match)
4. **Missing values:** หลายแถวมี Type = None หรือ "-"
5. **Mixed languages ใน status:** "In Service" กับ "ห้อง PJ" ปน
6. **Date format inconsistent:** บาง cell เป็น datetime, บางอันเป็น string "19/2/2025"

**ทางแก้:** ในขั้น import ให้ทำ validation report แสดงแถวที่มีปัญหา และให้ user decide ทีละแถว หรือ skip
