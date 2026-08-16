import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedWorldWarOnePersonGroups } from '../seeds/personGroup.ww1.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-ww1-person-groups-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: WWI 관련 인물들이 먼저 등록돼 있어야 한다. 미등록 인물은 warn 후 건너뛰고,
 * 나중에 인물이 등록되면 이 시드를 다시 돌려 멤버만 백필하면 된다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedWorldWarOnePersonGroups(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 제1차 세계대전 인물 묶음 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
