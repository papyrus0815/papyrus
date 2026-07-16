import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedAustriaHistoricalCountries } from '../seeds/historicalCountry.austria.seed'
import { seedAustriaHistoricalCountryRelations } from '../seeds/historicalCountry.austria.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedAustriaHistoricalCountries(prisma)
    await seedAustriaHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 오스트리아 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
