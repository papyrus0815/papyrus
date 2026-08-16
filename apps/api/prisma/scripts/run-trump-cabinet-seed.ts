import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedBackfillPersonCountryId } from '../seeds/backfill.person-country-id.seed'
import { seedGovernmentPositionDefinitions } from '../seeds/governmentPositionDefinition.seed'
import { seedGovernmentPositionDefinitionScopes } from '../seeds/governmentPositionDefinitionScope.seed'
import { seedTrumpCabinet } from '../seeds/person.trump-cabinet.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-trump-cabinet-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: admin 계정 + '미국' Country(country.seed.ts에 이미 존재).
 * 관직 정의(국무장관 등 신설 10종 포함)를 먼저 멱등 시딩한 뒤 각료 18명을 등록하고,
 * 마지막에 미국 고유 명칭 3종(국무장관/주택도시개발장관/국토안보장관) 스코프를 붙인다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedGovernmentPositionDefinitions(prisma)
    await seedTrumpCabinet(prisma)
    await seedGovernmentPositionDefinitionScopes(prisma)
    await seedBackfillPersonCountryId(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 트럼프 2기 내각 각료 시딩 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
