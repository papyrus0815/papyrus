import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedTradeCommodityCatalog } from '../seeds/trade.commodity-catalog.seed'
import { seedTradeRecords } from '../seeds/trade.records.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 기록이 카탈로그 품목을 참조하므로 카탈로그를 먼저 맞춘다(멱등).
    await seedTradeCommodityCatalog(prisma)
    await seedTradeRecords(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
