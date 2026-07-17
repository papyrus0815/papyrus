import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedAustriaHistoricalCountryRelations } from '../seeds/historicalCountry.austria.relations.seed'
import { seedBritainHistoricalCountryRelations } from '../seeds/historicalCountry.britain.relations.seed'
import { seedCroatiaHistoricalCountryRelations } from '../seeds/historicalCountry.croatia.relations.seed'

/**
 * 동군연합 수평 관계(PERSONAL_UNION) + 두브로브니크 소속 기간 백필 전용 러너.
 * 세 relations 시드 모두 skip-if-exists 멱등이라 기존 계승·소속 행은 건너뛴다.
 */
async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await seedCroatiaHistoricalCountryRelations(prisma)
    await seedAustriaHistoricalCountryRelations(prisma)
    await seedBritainHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 동군연합 수평 관계 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
