// Script to create a peminjam (siswa) user with NISN
// Usage: node scripts/create-peminjam.js

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
  const siswaNisn = '4445556666';
  const siswaPassword = 'deni123';
  const siswaName = 'Deni Prasetyo';

  // Check if student with this NISN already exists
  let existingSiswa = await prisma.user.findUnique({
    where: {
      nisn: siswaNisn,
    },
  });

  if (existingSiswa) {
    console.log('Student user already exists with this NISN:');
    console.log('  ID:', existingSiswa.id);
    console.log('  Nama:', existingSiswa.nama);
    console.log('  NISN:', existingSiswa.nisn);
    console.log('  Role:', existingSiswa.role);
  } else {
    // Create student user
    const hashedPassword = await bcrypt.hash(siswaPassword, 10);
    
    const siswa = await prisma.user.create({
      data: {
        nama: siswaName,
        nisn: siswaNisn,
        password: hashedPassword,
        role: 'PEMINJAM',
      },
    });

    console.log('Student user created successfully!');
    console.log('  ID:', siswa.id);
    console.log('  Nama:', siswa.nama);
    console.log('  NISN:', siswa.nisn);
    console.log('  Role:', siswa.role);
  }

  console.log('\n=== STUDENT LOGIN CREDENTIALS ===');
  console.log('Role: Siswa');
  console.log('NISN: ' + siswaNisn);
  console.log('Password: ' + siswaPassword);
  console.log('=============================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
