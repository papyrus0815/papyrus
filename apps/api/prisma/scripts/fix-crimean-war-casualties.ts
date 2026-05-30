/**
 * 크림 전쟁 사상자/섹션 정정.
 *
 * 최초 시드에서 CasualtiesData.militaryKilled(VarChar 100) 필드에 서술형 문장 + 국가별 내역을
 * 욱여넣어 스키마 의도("사망 수치")·franco-prussian 컨벤션과 어긋났다. 사망=간결 수치, 내역/단서는
 * total로 옮기고, "전후 처리와 영향" 섹션의 흑해 일방 파기 연도(1871→1870)를 정정한다.
 *
 * 시드는 "이미 존재 시 스킵"이라 재실행으로는 갱신되지 않으므로, 기존 행을 삭제 후
 * seedCrimeanWar를 재호출해 수정된 시드값으로 재생성한다(시드를 단일 진실원천으로 유지).
 *
 * 실행: node -r ./prisma-seed-loader.js ./node_modules/.bin/tsx apps/api/prisma/scripts/fix-crimean-war-casualties.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { seedCrimeanWar } from '../seeds/event.crimean-war.seed'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const ev = await prisma.event.findFirst({
      where: { title: '크림 전쟁', startDate: new Date('1853-10-16'), deletedAt: null },
      select: { id: true },
    })
    if (!ev) {
      console.warn('  ⚠️  크림 전쟁 사건 미존재 — seedCrimeanWar 먼저 실행 필요')
      return
    }

    const delCas = await prisma.casualtiesData.deleteMany({ where: { eventId: ev.id } })
    console.log(`  🗑️  사상자 ${delCas.count}건 삭제`)

    const delSec = await prisma.eventSection.deleteMany({
      where: { eventId: ev.id, title: '전후 처리와 영향' },
    })
    console.log(`  🗑️  섹션 '전후 처리와 영향' ${delSec.count}건 삭제`)

    // 수정된 시드값으로 재생성 (다른 항목은 이미 존재하므로 스킵)
    await seedCrimeanWar(prisma)

    // 결과 확인
    const cas = await prisma.casualtiesData.findMany({
      where: { eventId: ev.id },
      select: { sideName: true, militaryKilled: true, total: true },
    })
    console.log('\n  📊 정정 후 사상자:')
    for (const c of cas) {
      console.log(`    [${c.sideName}] 사망=${c.militaryKilled} / 합계=${c.total}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('\n❌ 교정 실패:', e)
  process.exit(1)
})
