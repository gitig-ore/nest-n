-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PEMINJAM');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('DIPINJAM', 'DIKEMBALIKAN', 'TERLAMBAT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barang" (
    "id" TEXT NOT NULL,
    "kodeBarang" TEXT NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "kondisi" TEXT NOT NULL,
    "stok" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "tanggalPinjam" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggalKembali" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL,
    "peminjamId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "barangId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Barang_kodeBarang_key" ON "Barang"("kodeBarang");

-- CreateIndex
CREATE INDEX "Barang_namaBarang_idx" ON "Barang"("namaBarang");

-- CreateIndex
CREATE INDEX "Loan_peminjamId_idx" ON "Loan"("peminjamId");

-- CreateIndex
CREATE INDEX "Loan_adminId_idx" ON "Loan"("adminId");

-- CreateIndex
CREATE INDEX "Loan_barangId_idx" ON "Loan"("barangId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_peminjamId_fkey" FOREIGN KEY ("peminjamId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "Barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
