import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedLeopoldIBelgium } from '../seeds/person.leopold-i-belgium.seed'

/**
 * 단독 실행: 레포 루트에서 `npx tsx apps/api/prisma/scripts/run-leopold-i-belgium-seed.ts`
 * (러너가 process.cwd() 기준으로 env.development를 읽으므로 반드시 루트에서 실행)
 *
 * 선행 조건: admin 계정·벨기에 왕국 HC가 있어야 한다(없으면 warn 후 중단).
 * 「벨기에 왕가 (작센-코부르크-고타)」 왕조·'국왕' 관직 정의·나머지 HC·형·누나 Person 행은
 * 있으면 연결하고 없으면 해당 항목만 생략한다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedLeopoldIBelgium(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 레오폴트 1세 인물 시드 완료\n'))
  .catch((err) => {
    console.error('\n❌ 시드 실패:', err)
    process.exit(1)
  })
