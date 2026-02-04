const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

(async () => {
  const args = parseArgs();
  const nama = args.nama || args.name;
  const nisn = args.nisn;
  const nip = args.nip;
  const password = args.password || process.env.PASSWORD || 'password';

  if (!nama) {
    console.error('Usage: node create-admin.js --nama "Admin Name" [--nisn 123] [--nip 456] [--password secret]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const identTrim = (nisn || nip || nama).toString().trim();

    let user;
    if (nisn) {
      user = await prisma.user.findUnique({ where: { nisn: nisn } }).catch(() => null);
    } else if (nip) {
      user = await prisma.user.findUnique({ where: { nip: nip } }).catch(() => null);
    } else {
      user = await prisma.user.findFirst({ where: { nama: { contains: nama, mode: 'insensitive' } } }).catch(() => null);
    }

    const hashed = await bcrypt.hash(password, 10);

    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed, role: 'ADMIN' } });
      console.log(`Updated existing user id=${user.id} nama="${user.nama}" to role=ADMIN and set new password.`);
    } else {
      const created = await prisma.user.create({
        data: {
          nama: nama,
          nisn: nisn || null,
          nip: nip || null,
          password: hashed,
          role: 'ADMIN',
        },
      });
      console.log(`Created ADMIN user id=${created.id} nama="${created.nama}"` + (nisn ? ` nisn=${nisn}` : '') + (nip ? ` nip=${nip}` : '') );
    }
  } catch (err) {
    console.error('Error:', err?.stack || err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
