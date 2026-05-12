import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedFriedrichIIIParents } from '../seeds/person.friedrich-iii-parents.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedFriedrichIIIParents(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 프리드리히 3세 부모 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
