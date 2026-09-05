import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPotiorek } from '../seeds/person.potiorek.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-potiorek-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: admin 계정 + '오스트리아-헝가리 제국' HC.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPotiorek(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 오스카어 포티오레크 인물 시딩 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
