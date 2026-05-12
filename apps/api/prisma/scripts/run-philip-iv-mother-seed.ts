import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedPhilipIVMother } from '../seeds/person.philip-iv-mother.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedPhilipIVMother(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 펠리페 4세 어머니 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
