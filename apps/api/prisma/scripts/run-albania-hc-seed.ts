import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCountries } from '../seeds/country.seed'
import { seedAlbaniaHistoricalCountries } from '../seeds/historicalCountry.albania.seed'
import { seedAlbaniaHistoricalCountryRelations } from '../seeds/historicalCountry.albania.relations.seed'
import { seedGreeceHistoricalCountries } from '../seeds/historicalCountry.greece.seed'
import { seedMontenegroHistoricalCountries } from '../seeds/historicalCountry.montenegro.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 현대 국가 알바니아(AL)만 타겟 upsert — 전체 국가 재실행은 UI 편집을 덮어쓰므로 금지
    const continents = await prisma.continent.findMany({ select: { id: true, name: true } })
    const continentMap = new Map(continents.map((continent) => [continent.name, continent.id]))
    await seedCountries(prisma, continentMap, ['AL'])

    await seedAlbaniaHistoricalCountries(prisma)
    await seedAlbaniaHistoricalCountryRelations(prisma)

    // 두클랴·제타 공국(montenegro)·에페이로스 전제군주국(greece)의 'AL 미래용' 표기를 활성화한다.
    // 두 시드는 이름 기반 skip-if-exists + 링크 additive라 재실행이 안전하다.
    await seedMontenegroHistoricalCountries(prisma)
    await seedGreeceHistoricalCountries(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 알바니아 국가·역사 국가 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
