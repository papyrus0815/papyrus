import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedNaziGermanyMilitaryUnits } from '../seeds/militaryUnit.naziGermany.seed'

/** 실행(레포 루트): npx ts-node apps/api/prisma/scripts/run-nazi-germany-military-units-seed.ts */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedNaziGermanyMilitaryUnits(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 나치 독일 군부대 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
