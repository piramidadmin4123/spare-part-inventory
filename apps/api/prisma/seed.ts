import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SITES = [
  { code: 'BKK', name: 'Bangkok HQ', description: 'Main office in Bangkok' },
  { code: 'REIGNWOOD_CUR', name: 'Reignwood (ปัจจุบัน)', description: 'Current Reignwood site' },
  { code: 'REIGNWOOD_OLD', name: 'Reignwood (เก่า)', description: 'Legacy Reignwood site' },
  { code: 'KIS', name: 'KIS', description: 'KIS site' },
  { code: 'TEACHER_DORM', name: 'Teacher Dormitory', description: 'Teacher Dormitory site' },
  { code: 'PKT', name: 'Phuket', description: 'Phuket site' },
  { code: 'SMI', name: 'Samui', description: 'Samui site' },
];

const EQUIPMENT_TYPES = [
  { code: 'AP-A', category: 'Access Point', name: 'Access Point (Aruba)' },
  { code: 'AP-C', category: 'Access Point', name: 'Access Point (Cisco)' },
  { code: 'AP-R', category: 'Access Point', name: 'Access Point (Ruckus)' },
  { code: 'AP-H', category: 'Access Point', name: 'Access Point (Huawei)' },
  { code: 'AP-RJ', category: 'Access Point', name: 'Access Point (Ruijie)' },
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
  { code: 'Router / Firewall', category: 'Firewall', name: 'Router/Firewall' },
  { code: 'Mini Gbic', category: 'Network', name: 'Mini GBIC SFP' },
  { code: 'Fiber', category: 'Network', name: 'Fiber Cable' },
  { code: 'Media Converter', category: 'Network', name: 'Media Converter' },
  { code: 'Controller', category: 'Network', name: 'Wireless Controller' },
  { code: 'Adaptor', category: 'Accessory', name: 'Power Adaptor' },
  { code: 'HDD', category: 'Storage', name: 'Hard Disk Drive' },
];

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

async function main() {
  console.info('🌱 Seeding database...');

  // Seed sites
  for (const site of SITES) {
    await prisma.site.upsert({
      where: { code: site.code },
      update: {},
      create: site,
    });
  }
  console.info(`✓ ${SITES.length} sites seeded`);

  // Seed equipment types
  for (const type of EQUIPMENT_TYPES) {
    await prisma.equipmentType.upsert({
      where: { code: type.code },
      update: {},
      create: type,
    });
  }
  console.info(`✓ ${EQUIPMENT_TYPES.length} equipment types seeded`);

  // Seed brands
  for (const name of BRANDS) {
    await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.info(`✓ ${BRANDS.length} brands seeded`);

  const passwordHash = await bcrypt.hash('PiRaMiDAdMiN_541', 12);
  await prisma.user.upsert({
    where: { email: 'piramid_admin@gmail.com' },
    update: { passwordHash },
    create: {
      email: 'piramid_admin@gmail.com',
      name: 'Pyramid Admin',
      role: 'ADMIN',
      isActive: true,
      passwordHash,
    },
  });
  console.info('✓ Admin user seeded');

  console.info('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
