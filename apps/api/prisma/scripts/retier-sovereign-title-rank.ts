import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

/**
 * 군주 칭호(isMonarchical=true) 정의의 rank를 위계(레벨)로 재정렬.
 *
 * 그전엔 황제·국왕·교황·술탄·공작·대공·공국 군주가 전부 rank 1이라 '군주 등록' 피커에서
 * 황제와 국왕, 공작이 구분 없이 가나다순으로 섞였다. rank 칸은 원래 "같은 기록가족 안의 서열"
 * (관리 화면에 '서열 N'으로 표시)이라 새 컬럼 없이 값만 바로잡는다.
 *
 *   1 황제급   황제 · 천황 · 교황 · 칸
 *   2 국왕급   국왕 · 여왕 · 술탄 · 로마왕 · 이탈리아왕
 *   3 대공급   대공 · 선제후
 *   4 공작급   공작 · 공국 군주 · 변경백 · 방백
 *   5 백작급   백작
 *   6 번주     (막부 아래 영주)
 *
 * 대통령·총리·장관 등 공직의 rank는 건드리지 않는다 — 가족이 다르면 서열 축도 다르다.
 * 멱등(같은 값이면 no-op). 실행: npx tsx apps/api/prisma/scripts/retier-sovereign-title-rank.ts
 */
const SOVEREIGN_TIERS: Record<string, number> = {
  황제: 1,
  천황: 1,
  교황: 1,
  칸: 1,
  국왕: 2,
  여왕: 2,
  술탄: 2,
  로마왕: 2,
  이탈리아왕: 2,
  대공: 3,
  선제후: 3,
  공작: 4,
  '공국 군주': 4,
  변경백: 4,
  방백: 4,
  백작: 5,
  번주: 6,
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const sovereigns = await prisma.governmentPositionDefinition.findMany({
      where: { isMonarchical: true },
      select: { id: true, title: true, rank: true },
    })
    let changed = 0
    for (const definition of sovereigns) {
      const tier = SOVEREIGN_TIERS[definition.title]
      if (tier === undefined) {
        console.log(`  ⚠️  위계 미지정: ${definition.title} (rank ${definition.rank}) — 그대로 둠`)
        continue
      }
      if (definition.rank === tier) continue
      await prisma.governmentPositionDefinition.update({
        where: { id: definition.id },
        data: { rank: tier },
      })
      console.log(`  ✅ ${definition.title}: ${definition.rank} → ${tier}`)
      changed++
    }
    console.log(`\n군주 칭호 ${sovereigns.length}건 중 ${changed}건 위계 갱신`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('❌ 실패:', err)
  process.exit(1)
})
