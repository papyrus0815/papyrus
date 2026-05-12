import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCateauCambresis1559 } from '../seeds/event.cateau-cambresis-1559.seed'
import { seedFranceHistoricalCountries } from '../seeds/historicalCountry.france.seed'
import { seedSavoyHistoricalCountries } from '../seeds/historicalCountry.savoy.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 의존성: 프랑스 왕국·사보이 공국 historicalCountry가 먼저 존재해야 함
    await seedFranceHistoricalCountries(prisma)
    await seedSavoyHistoricalCountries(prisma)
    await seedCateauCambresis1559(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 1559 카토-캄브레지 조약 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
