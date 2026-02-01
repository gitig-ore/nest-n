const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const hashed = await bcrypt.hash('password', 10);
    const user = await prisma.user.create({
      data: {
        nama: 'Test User',
        nisn: '123456',
        password: hashed,
        role: 'PEMINJAM',
      },
    });
    console.log('Created user:', { id: user.id, nama: user.nama, nisn: user.nisn });
  } catch (e) {
    console.error('Failed to create user:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();