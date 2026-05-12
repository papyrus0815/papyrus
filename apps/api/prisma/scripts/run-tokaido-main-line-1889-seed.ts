import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedTokaidoMainLine1889 } from '../seeds/event.tokaido-main-line-1889.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedTokaidoMainLine1889(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 1889 도카이도 본선 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
