import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedSanFranciscoTreatyPersons } from '../seeds/event.san-francisco-treaty.persons.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedSanFranciscoTreatyPersons(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ SF 강화조약 인물 보강 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
