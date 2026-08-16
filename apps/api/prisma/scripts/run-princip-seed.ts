import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPrincip } from '../seeds/person.princip.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-princip-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: admin 계정·역사 국가(오스트리아-헝가리 제국)가 이미 있어야 한다.
 * admin/HC 없으면 warn 후 중단. 세르비아 왕국(근대) HC와 「사라예보 암살 사건」 event는
 * 있으면 연결하고 없으면 해당 행만 생략한다(관직 정의 의존은 없음 — 재임 0건 인물).
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPrincip(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 가브릴로 프린치프 인물 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
