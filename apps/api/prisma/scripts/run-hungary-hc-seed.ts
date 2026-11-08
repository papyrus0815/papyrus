import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedHungaryHistoricalCountries } from '../seeds/historicalCountry.hungary.seed'
import { seedHungaryHistoricalCountryRelations } from '../seeds/historicalCountry.hungary.relations.seed'

/** 실행(레포 루트): npx ts-node apps/api/prisma/scripts/run-hungary-hc-seed.ts */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedHungaryHistoricalCountries(prisma)
    await seedHungaryHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 헝가리 역사 국가 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
