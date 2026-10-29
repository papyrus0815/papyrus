import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedEgyptHistoricalCountries } from '../seeds/historicalCountry.egypt.seed'
import { seedEgyptHistoricalCountryRelations } from '../seeds/historicalCountry.egypt.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 현대 EG·SD·IR·SA·SY·IQ는 이미 등록돼 있어 country 시드를 다시 돌리지 않는다
    // (전체 재실행은 upsert-update라 사용자 UI 편집을 시드값으로 덮어씀 — 금지)
    await seedEgyptHistoricalCountries(prisma)
    await seedEgyptHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 이집트 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
