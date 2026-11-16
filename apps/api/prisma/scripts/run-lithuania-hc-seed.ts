/** 실행(레포 루트): npx ts-node apps/api/prisma/scripts/run-lithuania-hc-seed.ts */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedLithuaniaHistoricalCountries } from '../seeds/historicalCountry.lithuania.seed'
import { seedLithuaniaHistoricalCountryRelations } from '../seeds/historicalCountry.lithuania.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // LT·LV·EE·BY·PL 현대 국가는 이미 등록돼 있어 country 시드는 돌리지 않는다
    await seedLithuaniaHistoricalCountries(prisma)
    await seedLithuaniaHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 리투아니아 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
