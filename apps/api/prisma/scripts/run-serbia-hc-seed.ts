import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedSerbiaHistoricalCountries } from '../seeds/historicalCountry.serbia.seed'
import { seedSerbiaHistoricalCountryRelations } from '../seeds/historicalCountry.serbia.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedSerbiaHistoricalCountries(prisma)
    await seedSerbiaHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 세르비아 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
