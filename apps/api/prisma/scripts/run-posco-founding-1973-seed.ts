import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPoscoFounding1973 } from '../seeds/event.posco-founding-1973.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPoscoFounding1973(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 포항제철(POSCO) 건설 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
