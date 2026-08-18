import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for local development...');

  // 1. Create a default Admin User for NextAuth
  const email = 'admin@example.com';
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Default Admin user ensured: ${admin.email} (password: ${plainPassword})`);

  // 2. Create a default Business Profile
  const defaultProfileId = 'default-business-profile';
  const profile = await prisma.businessProfile.upsert({
    where: { id: defaultProfileId },
    update: {},
    create: {
      id: defaultProfileId,
      companyName: 'Local Dev Business',
      address: '123 Developer Lane, Code City',
      phone: '+1 234 567 8900',
      email: 'contact@localdev.com',
      gstNumber: '00DEV0000X0Z0',
      defaultTerms: '1. Local terms apply.\n2. Payment within 30 days.',
    },
  });
  console.log(`✅ Default Business Profile ensured: ${profile.companyName}`);

  // 3. Create default Worker Types
  const workerTypes = [
    { name: 'Mason', rate: 800 },
    { name: 'Helper', rate: 500 },
    { name: 'Carpenter', rate: 900 },
    { name: 'Painter', rate: 750 },
    { name: 'Electrician', rate: 1000 },
  ];

  for (const wt of workerTypes) {
    const existing = await prisma.workerType.findFirst({ where: { name: wt.name } });
    if (!existing) {
      await prisma.workerType.create({
        data: {
          name: wt.name,
          defaultRate: wt.rate,
          isActive: true,
        },
      });
      console.log(`✅ Created Worker Type: ${wt.name}`);
    }
  }

  // 4. Create default BOQ Groups
  const defaultGroups = [
    { name: 'Civil Works' },
    { name: 'Electrical Works' },
    { name: 'Plumbing Works' },
    { name: 'Finishing Works' },
    { name: 'Miscellaneous' },
  ];

  for (const g of defaultGroups) {
    const existing = await prisma.bOQGroup.findFirst({ where: { name: g.name } });
    if (!existing) {
      await prisma.bOQGroup.create({
        data: {
          name: g.name,
          isActive: true,
        },
      });
      console.log(`✅ Created BOQ Group: ${g.name}`);
    }
  }

  console.log('✅ Local database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
