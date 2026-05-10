/**
 * 카스티야 reign ordinal 재조정 스크립트
 *
 * 페르난도 5세(이사벨 1세 jure uxoris 공동 군주, NULL slot)와 일관성을 맞추기 위해
 * 후아나 1세의 jure uxoris/jure matris 공동 군주들을 모두 NULL slot으로 정리하고
 * 후속 군주들의 ordinal을 한 칸씩 앞당긴다.
 *
 * 변경:
 *   ① 펠리페 1세 14대 → NULL (jure uxoris 공동 군주)
 *   ② 카를로스 1세 15대 → 14대 (재위 내내 어머니 후아나와 공동 jure matris였으나 단일 ordinal로 통합)
 *   ③ 펠리페 2세 16대 → 15대
 *   ④ 펠리페 3세 17대 → 16대
 *
 * 실행 순서: NULL 처리(슬롯 비움) → 작은 번호부터 한 칸씩 앞당김.
 * unique constraint (historicalCountryId, regnalNumber)는 NULL distinct.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

type Adjustment = {
  originalName: string
  newRegnalNumber: number | null
  newRegnalName: string
}

// 순서가 중요: NULL 처리 후 작은 번호 → 큰 번호 순으로 이동
const ADJUSTMENTS: Adjustment[] = [
  {
    originalName: 'Philip I of Castile',
    newRegnalNumber: null,
    newRegnalName: '펠리페 1세 (후아나 1세 jure uxoris 공동 군주)',
  },
  {
    originalName: 'Charles V, Holy Roman Emperor',
    newRegnalNumber: 14,
    newRegnalName: '카를로스 1세',
  },
  {
    originalName: 'Philip II of Spain',
    newRegnalNumber: 15,
    newRegnalName: '펠리페 2세',
  },
  {
    originalName: 'Philip III of Spain',
    newRegnalNumber: 16,
    newRegnalName: '펠리페 3세',
  },
]

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const castileHC = await prisma.historicalCountry.findFirst({
      where: { name: '카스티야 왕국' },
      select: { id: true },
    })
    if (!castileHC) {
      console.error('❌ 카스티야 왕국 HC 미존재')
      return
    }

    console.log('\n🔧 카스티야 reign ordinal 재조정 시작...\n')

    for (const adj of ADJUSTMENTS) {
      const person = await prisma.person.findFirst({
        where: { originalName: adj.originalName },
        select: { id: true },
      })
      if (!person) {
        console.warn(`  ⚠️  인물 미존재: ${adj.originalName}`)
        continue
      }
      const reign = await prisma.sovereignReign.findFirst({
        where: { personId: person.id, historicalCountryId: castileHC.id },
      })
      if (!reign) {
        console.warn(`  ⚠️  재임 미존재: ${adj.originalName}`)
        continue
      }
      if (
        reign.regnalNumber === adj.newRegnalNumber &&
        reign.regnalName === adj.newRegnalName
      ) {
        console.log(
          `  ⏭️  스킵 (이미 정확): ${adj.originalName} → ${adj.newRegnalNumber ?? '공동'}대 / ${adj.newRegnalName}`,
        )
        continue
      }
      await prisma.sovereignReign.update({
        where: { id: reign.id },
        data: {
          regnalNumber: adj.newRegnalNumber,
          regnalName: adj.newRegnalName,
        },
      })
      console.log(
        `  ✅ ${adj.originalName}: ${reign.regnalNumber ?? '공동'}대 → ${adj.newRegnalNumber ?? '공동'}대 / ` +
          `regnalName "${reign.regnalName}" → "${adj.newRegnalName}"`,
      )
    }

    // 결과 확인
    console.log('\n=== 정정 후 카스티야 reign 라인 ===')
    const reigns = await prisma.sovereignReign.findMany({
      where: { historicalCountryId: castileHC.id },
      select: {
        regnalNumber: true,
        regnalName: true,
        startDate: true,
        endDate: true,
        person: { select: { originalName: true } },
      },
      orderBy: [{ regnalNumber: 'asc' }, { startDate: 'asc' }],
    })
    for (const r of reigns) {
      const fmt = (d: Date | null) =>
        d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '?'
      console.log(
        `${String(r.regnalNumber ?? '공동').padStart(4)} | ${(r.regnalName ?? '?').padEnd(46)} | ${fmt(r.startDate)} ~ ${fmt(r.endDate)} | ${r.person.originalName}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 카스티야 reign ordinal 재조정 완료\n'))
  .catch((e) => {
    console.error('❌', e)
    process.exit(1)
  })
