import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedEventStatehoodBackfill } from '../seeds/event.statehood-backfill.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-event-statehood-backfill.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 기존 사건의 유형을 '건국·멸망'(STATEHOOD)으로 재분류하고
 * 해당 국가의 배역을 FOUNDED/DISSOLVED로 백필한다. 멱등.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedEventStatehoodBackfill(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 건국/멸망 백필 완료\n'))
  .catch((err) => {
    console.error('\n❌ 백필 실패:', err)
    process.exit(1)
  })
