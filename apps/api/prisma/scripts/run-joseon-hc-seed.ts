import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedJoseonHistoricalCountries } from '../seeds/historicalCountry.joseon.seed'
import { seedJoseonHistoricalCountryRelations } from '../seeds/historicalCountry.joseon.relations.seed'

/**
 * 조선 왕조(고려 → 조선 → 대한제국) 역사 국가 단독 시드 러너.
 *
 * 실행: 레포 루트에서
 *   npx tsx apps/api/prisma/scripts/run-joseon-hc-seed.ts
 * (dotenv 경로가 cwd 상대인 심볼릭 링크 `env.development`라 반드시 루트에서 실행할 것)
 *
 * ⚠️ 알바니아 러너와 달리 seedCountries()를 호출하지 않는다.
 *    - 대한민국(KR)은 country 테이블에 이미 있어 upsert할 이유가 없고,
 *    - 현대 국가 upsert는 UI 편집을 덮어쓸 수 있어 필요할 때만 타겟 실행하는 것이 규약이다.
 *    - 북한(KP)은 country 테이블에 아직 없어 이 배치의 KP 링크는 경고 후 skip된다.
 *      훗날 KP가 등록되면 이 러너를 다시 돌리는 것만으로 링크가 additive하게 채워진다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedJoseonHistoricalCountries(prisma)
    // 계승 상대인 '일본 제국'·'청나라'는 선재 행이라 별도 시드 호출이 필요 없다.
    await seedJoseonHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 조선 왕조 역사 국가 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
