import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCountries } from '../seeds/country.seed'
import { seedMiddleEast20232025 } from '../seeds/event.middle-east-2023-2025.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    // 의존성: 신규 country(시리아·레바논·팔레스타인·예멘·이라크) 보장
    const continents = await prisma.continent.findMany({ select: { id: true, name: true } })
    const continentMap = new Map(continents.map((c) => [c.name, c.id]))
    await seedCountries(prisma, continentMap)

    await seedMiddleEast20232025(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 2023-2025 중동 12건 시드 완료\n'))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error)
    process.exit(1)
  })
