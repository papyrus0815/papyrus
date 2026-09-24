import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCountries } from '../seeds/country.seed'
import { seedDenmarkHistoricalCountries } from '../seeds/historicalCountry.denmark.seed'
import { seedSwedenHistoricalCountries } from '../seeds/historicalCountry.sweden.seed'
import { seedSwedenHistoricalCountryRelations } from '../seeds/historicalCountry.sweden.relations.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 현대 국가 스웨덴(SE)만 타겟 upsert — 전체 국가 재실행은 UI 편집을 덮어쓰므로 금지
    const continents = await prisma.continent.findMany({ select: { id: true, name: true } })
    const continentMap = new Map(continents.map((continent) => [continent.name, continent.id]))
    await seedCountries(prisma, continentMap, ['SE'])

    // denmark 시드가 칼마르 동맹에 'SE 미래용' 링크를 표기해 둔 상태 —
    // SE 생성 뒤 엔티티 시드를 한 번 더 돌려 링크만 활성화한다(생성은 skip-if-exists라 멱등)
    await seedDenmarkHistoricalCountries(prisma)

    await seedSwedenHistoricalCountries(prisma)
    await seedSwedenHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 스웨덴 국가·역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
