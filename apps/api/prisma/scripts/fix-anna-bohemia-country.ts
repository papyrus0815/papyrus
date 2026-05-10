/**
 * 안나 폰 뵈멘 운트 운가른(Anna of Bohemia and Hungary)의 countryId를 보헤미아(CZ)로 정정.
 * 이전에 신성로마제국 affiliation으로 잘못 백필되어 오스트리아(AT) 국기가 표시되던 문제 fix.
 *
 * 실행: npx ts-node apps/api/prisma/scripts/fix-anna-bohemia-country.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedBackfillPersonCountryId } from '../seeds/backfill.person-country-id.seed'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const anna = await prisma.person.findFirst({
      where: { originalName: 'Anna of Bohemia and Hungary' },
      select: {
        id: true, countryId: true,
        country: { select: { name: true, isoCode: true } },
      },
    })
    if (!anna) {
      console.warn('  ⚠️  안나 폰 뵈멘 미존재')
      return
    }
    console.log(`  현재 countryId: ${anna.countryId} (${anna.country?.name ?? '없음'} / ${anna.country?.isoCode ?? '-'})`)

    // countryId 초기화 → 백필 스크립트가 첫 CITIZENSHIP affiliation(보헤미아) 기준으로 재계산
    await prisma.person.update({
      where: { id: anna.id },
      data: { countryId: null },
    })
    console.log(`  🔧 안나 countryId 초기화`)

    await seedBackfillPersonCountryId(prisma)

    const after = await prisma.person.findFirst({
      where: { id: anna.id },
      select: {
        countryId: true,
        country: { select: { name: true, isoCode: true, flagEmoji: true } },
      },
    })
    console.log(`  ✅ 정정 후: ${after?.country?.name ?? '없음'} / ${after?.country?.isoCode ?? '-'} ${after?.country?.flagEmoji ?? ''}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
