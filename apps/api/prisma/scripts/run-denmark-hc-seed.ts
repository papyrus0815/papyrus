import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedDenmarkHistoricalCountries } from '../seeds/historicalCountry.denmark.seed'
import { seedDenmarkHistoricalCountryRelations } from '../seeds/historicalCountry.denmark.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedDenmarkHistoricalCountries(prisma)
    await seedDenmarkHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 덴마크 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
