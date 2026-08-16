import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedGermanEmpireMilitaryUnits } from '../seeds/militaryUnit.germanEmpire.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-german-empire-military-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: 현대 국가(DE)·역사 국가(독일 제국)·부처 카테고리(국방)·인물(폰 클루크)이 이미 있어야 한다.
 * 없으면 각각 warn 후 해당 연결만 건너뛴다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedGermanEmpireMilitaryUnits(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 독일 제국 군부대 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
