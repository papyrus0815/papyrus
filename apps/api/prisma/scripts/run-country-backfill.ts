import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedBackfillPersonCountryId } from '../seeds/backfill.person-country-id.seed'
import { seedBackfillPersonCountry } from '../seeds/backfill.person-country.seed'
import { seedContinents } from '../seeds/continent.seed'
import { seedCountries } from '../seeds/country.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 1) 대륙 + 국가 (ES/PT 신규 추가 포함, 나머지 idempotent upsert)
    const continentMap = await seedContinents(prisma)
    await seedCountries(prisma, continentMap)

    // 2) HC ↔ 모던 링크 보강 + Person affiliation 추가
    await seedBackfillPersonCountry(prisma)

    // 3) Person.countryId 백필 (affiliation → countryId)
    await seedBackfillPersonCountryId(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ Person 국가 정보 통합 백필 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
