import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedBulow } from '../seeds/person.bulow.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-bulow-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: admin 계정 + '독일 제국' HC + 관직 정의(총리·외무장관·대사·공사, 이미 시딩됨).
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedBulow(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 베른하르트 폰 뷜로 인물 시딩 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
