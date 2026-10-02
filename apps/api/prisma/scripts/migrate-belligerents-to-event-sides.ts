/**
 * 진영 이관 (D1) — 옛 BelligerentSide·CountryInSide·CasualtiesData → EventSide + 참여국 줄 sideId + 측정값.
 *
 * Phase A 마이그(테이블 rename·칼럼 추가)와 Phase B 마이그(옛 테이블·칼럼 제거) 사이에 한 번 실행한다.
 * 데이터 정본은 seeds/data/event-sides.legacy-five-wars.ts — 5개 전쟁 시드도 같은 데이터를 쓴다.
 * 멱등이라 다시 돌려도 중복이 생기지 않는다.
 *
 * 실행: node -r ./prisma-seed-loader.js ./node_modules/.bin/tsx apps/api/prisma/scripts/migrate-belligerents-to-event-sides.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'
import { LEGACY_FIVE_WAR_SIDES, LEGACY_FIVE_WAR_SOURCE } from '../seeds/data/event-sides.legacy-five-wars'
import { applyEventSides } from '../seeds/lib/event-sides'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    for (const [title, sides] of Object.entries(LEGACY_FIVE_WAR_SIDES)) {
      const events = await prisma.event.findMany({ where: { title, deletedAt: null }, select: { id: true } })
      if (events.length !== 1) throw new Error(`사건 '${title}'이(가) ${events.length}건 — 정확히 1건이어야 합니다`)
      const result = await applyEventSides(prisma, events[0].id, sides, LEGACY_FIVE_WAR_SOURCE)
      console.log(`  ✅ ${title} — 진영 ${result.sides} · 소속 ${result.members} · 측정값 ${result.observations}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
