import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedUkraineHistoricalCountries } from '../seeds/historicalCountry.ukraine.seed'
import { seedUkraineHistoricalCountryRelations } from '../seeds/historicalCountry.ukraine.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 현대 UA·RU·PL·RO·KZ는 이미 등록돼 있어 country 시드를 다시 돌리지 않는다
    // (전체 재실행은 upsert-update라 사용자 UI 편집을 시드값으로 덮어씀 — 금지)
    await seedUkraineHistoricalCountries(prisma)
    await seedUkraineHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 우크라이나 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
