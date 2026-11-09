import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedNaziGermanyDepartments } from '../seeds/administrationDepartment.naziGermany.seed'

/** 실행(레포 루트): npx ts-node apps/api/prisma/scripts/run-nazi-germany-departments-seed.ts */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedNaziGermanyDepartments(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 나치 독일 국가 기관 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
