import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedAnseiEarthquakes } from '../seeds/event.ansei-earthquakes.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedAnseiEarthquakes(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ 안세이 대지진 시드 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
