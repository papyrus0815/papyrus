import { PrismaService } from '../prisma.service'

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  const r = await prisma.country.updateMany({
    data: { accountId: 'bf93b960-cec2-4205-9fe1-f34616855f85' },
  })
  console.log('updated:', r.count)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
