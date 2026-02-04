const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const ident = process.argv[2] || process.env.IDENT;
const newPass = process.argv[3] || process.env.PASSWORD || 'password';

if (!ident) {
  console.error('Usage: node reset-password.js <identifier> [newPassword]');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const identTrim = ident.toString().trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { nisn: identTrim },
          { nip: identTrim },
          { nama: { contains: identTrim, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      console.error('User not found for identifier:', identTrim);
      process.exit(1);
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    console.log(`Updated password for user id=${user.id} nama="${user.nama}" to "${newPass}"`);
  } catch (err) {
    console.error('Error:', err?.stack || err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
