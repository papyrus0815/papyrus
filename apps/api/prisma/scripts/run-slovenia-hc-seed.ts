import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCountries } from '../seeds/country.seed'
import { seedSloveniaHistoricalCountries } from '../seeds/historicalCountry.slovenia.seed'
import { seedSloveniaHistoricalCountryRelations } from '../seeds/historicalCountry.slovenia.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 현대 국가 슬로베니아(SI)만 타겟 upsert — 전체 국가 재실행은 UI 편집을 덮어쓰므로 금지
    const continents = await prisma.continent.findMany({ select: { id: true, name: true } })
    const continentMap = new Map(continents.map((c) => [c.name, c.id]))
    await seedCountries(prisma, continentMap, ['SI'])

    await seedSloveniaHistoricalCountries(prisma)
    await seedSloveniaHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 슬로베니아 국가·역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
