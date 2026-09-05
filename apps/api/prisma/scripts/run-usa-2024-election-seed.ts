import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedUsa2024Presidential } from '../seeds/election.usa-2024-presidential.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-usa-2024-election-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: '미국' 국가 + '2024년 미국 대통령 선거' 선거 행.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedUsa2024Presidential(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 2024년 미국 대통령 선거 시딩 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
