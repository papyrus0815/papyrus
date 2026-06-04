import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedContinents } from '../seeds/continent.seed'
import { seedCountries } from '../seeds/country.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 대륙 맵 확보 후 국가 upsert — 핀란드(FI) 신규 추가, 나머지는 idempotent
    const continentMap = await seedContinents(prisma)
    await seedCountries(prisma, continentMap)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ 핀란드 국가 등록 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
