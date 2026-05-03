import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedKoreanWar } from '../seeds/event.korean-war.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedKoreanWar(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ 한국전쟁 시드 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
