import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPalmerston } from '../seeds/person.palmerston.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPalmerston(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ 파머스턴 자작 인물 시드 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
