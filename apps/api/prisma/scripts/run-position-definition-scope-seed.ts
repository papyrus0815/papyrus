import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedGovernmentPositionDefinitions } from '../seeds/governmentPositionDefinition.seed'
import { seedGovernmentPositionDefinitionScopes } from '../seeds/governmentPositionDefinitionScope.seed'

/**
 * 관직 정의 + 적용 범위만 단독 실행하는 러너.
 *
 * 전체 시드(seed.ts)는 인물·사건까지 훑어 오래 걸리는데, 카탈로그 보강은 그 뒤에도 자주 필요하다.
 * 두 시드 모두 멱등(정의=title+positionType 자연키 skip / 스코프=(정의,국가) 자연키 skip)이라
 * 몇 번을 돌려도 중복이 생기지 않는다.
 *
 * 실행: npx tsx apps/api/prisma/scripts/run-position-definition-scope-seed.ts
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedGovernmentPositionDefinitions(prisma)
    await seedGovernmentPositionDefinitionScopes(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 관직 정의·적용 범위 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
