import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedBohemiaHistoricalCountries } from '../seeds/historicalCountry.bohemia.seed'
import { seedBohemiaHistoricalCountryRelations } from '../seeds/historicalCountry.bohemia.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedBohemiaHistoricalCountries(prisma)
    await seedBohemiaHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 보헤미아 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
