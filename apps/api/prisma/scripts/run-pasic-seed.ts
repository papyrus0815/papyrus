import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPasic } from '../seeds/person.pasic.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-pasic-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: admin 계정·역사 국가(세르비아 왕국(근대)·세르비아-크로아티아-슬로베니아
 * 왕국)·관직 정의(총리)가 이미 있어야 한다. admin/세르비아 왕국 없으면 warn 후 중단,
 * SCS 왕국·정의가 없으면 해당 재임·연결만 생략.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPasic(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 니콜라 파시치 인물 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
