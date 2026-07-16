import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCroatiaHistoricalCountries } from '../seeds/historicalCountry.croatia.seed'
import { seedCroatiaHistoricalCountryRelations } from '../seeds/historicalCountry.croatia.relations.seed'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

/** 역사 국가 연결 대상인 현대 크로아티아(HR)가 없으면 생성 (country.seed.ts와 동일 데이터) */
async function ensureModernCroatia(prisma: PrismaService): Promise<void> {
  const existing = await prisma.country.findFirst({ where: { isoCode: 'HR' } })
  if (existing) {
    console.log('  ⏭️  현대 크로아티아(HR) 이미 존재')
    return
  }
  const europe = await prisma.continent.findFirst({ where: { name: '유럽' } })
  if (!europe) {
    console.warn('  ⚠️  유럽 대륙을 찾을 수 없어 현대 크로아티아 생성 생략')
    return
  }
  await prisma.country.create({
    data: {
      name: '크로아티아',
      localName: 'Hrvatska',
      flagEmoji: '🇭🇷',
      isoCode: 'HR',
      population: 3871833,
      areaSqKm: 56594.0,
      continentId: europe.id,
      accountId: ACCOUNT_ID,
      defaultNameDisplayOrder: 'western',
    },
  })
  console.log('  ✅ 현대 크로아티아(HR) 생성')
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    await ensureModernCroatia(prisma)
    await seedCroatiaHistoricalCountries(prisma)
    await seedCroatiaHistoricalCountryRelations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 크로아티아 역사 국가 시드 완료\n'))
  .catch((err) => { console.error('\n❌ 시드 실패:', err); process.exit(1) })
