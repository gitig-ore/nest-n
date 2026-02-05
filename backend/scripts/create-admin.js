// Script to create an admin user with specific NIP
// Usage: node scripts/create-admin.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminNip = '1234567890';
  const adminPassword = 'admin123';
  const adminName = 'Admin IGPP';

  // Check if admin with this NIP already exists
  let existingAdmin = await prisma.user.findUnique({
    where: {
      nip: adminNip,
    },
  });

  if (existingAdmin) {
    console.log('Admin user already exists with this NIP:');
    console.log('  ID:', existingAdmin.id);
    console.log('  Nama:', existingAdmin.nama);
    console.log('  NIP:', existingAdmin.nip);
    console.log('  Role:', existingAdmin.role);
  } else {
    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        nama: adminName,
        nip: adminNip,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Admin user created successfully!');
    console.log('  ID:', admin.id);
    console.log('  Nama:', admin.nama);
    console.log('  NIP:', admin.nip);
    console.log('  Role:', admin.role);
  }

  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Identifier (NIP): ' + adminNip);
  console.log('Password: ' + adminPassword);
  console.log('=======================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
