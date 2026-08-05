import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import bcrypt from "bcryptjs"

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  const prisma = new PrismaClient({ adapter })

  const password = await bcrypt.hash("admin123", 10)

  const users = [
    { username: "admin", password, name: "Admin Utama", role: "ADMIN" },
    { username: "grader", password, name: "Operator 1 (Grader)", role: "GRADER" },
    { username: "operator", password, name: "Budi Utama (Operator 2)", role: "OPERATOR" },
    { username: "finance", password, name: "Admin Keuangan", role: "FINANCE" },
    { username: "owner", password, name: "Owner / Pemilik", role: "OWNER" },
    { username: "superadmin", password, name: "Super Admin", role: "SUPER_ADMIN" },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { password: u.password },
      create: u,
    })
    console.log(`User ${u.username} created/updated`)
  }

  const tobaccoType = await prisma.tobaccoType.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Virginia FC" },
  })

  await prisma.tobaccoGrade.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "A1", defaultPrice: 65000, tobaccoTypeId: tobaccoType.id },
  })
  await prisma.tobaccoGrade.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "A2", defaultPrice: 60000, tobaccoTypeId: tobaccoType.id },
  })
  await prisma.tobaccoGrade.upsert({
    where: { id: 3 },
    update: {},
    create: { name: "B1", defaultPrice: 55000, tobaccoTypeId: tobaccoType.id },
  })
  await prisma.tobaccoGrade.upsert({
    where: { id: 4 },
    update: {},
    create: { name: "B2", defaultPrice: 50000, tobaccoTypeId: tobaccoType.id },
  })
  await prisma.tobaccoGrade.upsert({
    where: { id: 5 },
    update: {},
    create: { name: "C1", defaultPrice: 45000, tobaccoTypeId: tobaccoType.id },
  })
  await prisma.tobaccoGrade.upsert({
    where: { id: 6 },
    update: {},
    create: { name: "AF", defaultPrice: 35000, tobaccoTypeId: tobaccoType.id },
  })

  await prisma.leafType.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Lamina" },
  })
  await prisma.leafType.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "Midrib" },
  })

  await prisma.packingType.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Keranjang Bambu", deductionWeight: 2.0 },
  })

  const warehouse = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: { code: "GDG01", name: "Gudang Temanggung 1" },
  })

  await prisma.lane.upsert({
    where: { id: 1 },
    update: {},
    create: { code: "GDG01-J1", name: "Jalur 1", warehouseId: warehouse.id },
  })
  await prisma.lane.upsert({
    where: { id: 2 },
    update: {},
    create: { code: "GDG01-J2", name: "Jalur 2", warehouseId: warehouse.id },
  })

  await prisma.farmer.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Siti Aminah", nik: "P-0891" },
  })

  await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Gudang Sendiri" },
  })

  console.log("Seed completed!")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
