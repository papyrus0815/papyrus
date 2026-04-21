import { PrismaService } from '../prisma.service'

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  const modern = await prisma.country.findMany({
    where: { isoCode: { in: ['NL', 'BE', 'KR', 'JP'] } },
    select: { name: true, isoCode: true, accountId: true },
  })
  console.log('MODERN:', modern)

  const admin = await prisma.account.findUnique({
    where: { username: 'admin' },
    select: { id: true, username: true },
  })
  console.log('ADMIN:', admin)

  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
