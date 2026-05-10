/**
 * 카를로스 1세 카스티야 reign을 두 단계로 분리하는 일회성 스크립트
 *
 * 변경 전:
 *   14대 카를로스 1세 (1516-01-23 ~ 1556-01-16, ABDICATION) — 단일 reign
 *
 * 변경 후:
 *   ① 공동(NULL) 카를로스 1세 jure matris (1516-01-23 ~ 1555-04-12, OTHER) — 어머니 후아나와 공동 통치
 *   ② 14대 카를로스 1세 단독 (1555-04-12 ~ 1556-01-16, ABDICATION) — 후아나 사망 후 약 9개월
 *
 * 실행 순서:
 *   1) 기존 14대 reign을 NULL slot으로 변경(14대 슬롯 비움) + endDate 단축
 *   2) 새 14대 단독 reign 생성
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    const castileHC = await prisma.historicalCountry.findFirst({
      where: { name: '카스티야 왕국' },
      select: { id: true },
    })
    const charlesV = await prisma.person.findFirst({
      where: { originalName: 'Charles V, Holy Roman Emperor' },
      select: { id: true },
    })
    const kingPos = await prisma.governmentPositionDefinition.findFirst({
      where: { title: '국왕' },
      select: { id: true },
    })
    const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
    if (!castileHC || !charlesV || !kingPos || !admin) {
      console.error('❌ 사전 의존성 누락')
      return
    }

    console.log('\n🔧 카를로스 1세 카스티야 reign 분리 시작...\n')

    // 1) 기존 14대 reign 조회 (jure matris로 변환할 대상)
    const existing14 = await prisma.sovereignReign.findFirst({
      where: {
        personId: charlesV.id,
        historicalCountryId: castileHC.id,
        regnalNumber: 14,
      },
    })

    if (existing14) {
      // 14대 slot 비우기 위해 NULL로 변경 + endDate 단축
      await prisma.sovereignReign.update({
        where: { id: existing14.id },
        data: {
          regnalNumber: null,
          regnalName: '카를로스 1세 (후아나 1세 jure matris 공동 군주)',
          endDate: new Date(1555, 3, 12), // 1555-04-12 후아나 사망
          endReasonDetail:
            '1555-04-12 어머니 후아나 1세 사망으로 jure matris(어머니 권리) 공동 군주 단계 종결, 단독 군주로 전환.',
        },
      })
      console.log(
        `  ✅ 기존 14대 → 공동(NULL) jure matris로 변환 + endDate 1556-01-16 → 1555-04-12`,
      )
    } else {
      // 이미 jure matris로 처리됐는지 확인
      const existingNull = await prisma.sovereignReign.findFirst({
        where: {
          personId: charlesV.id,
          historicalCountryId: castileHC.id,
          regnalNumber: null,
        },
      })
      if (existingNull) {
        console.log(`  ⏭️  스킵 — 이미 jure matris NULL slot 존재`)
      } else {
        console.warn(`  ⚠️  기존 14대 reign 없음 (이미 분리됐거나 초기화 안 됨)`)
      }
    }

    // 2) 새 14대 단독 reign 생성
    const slot14Conflict = await prisma.sovereignReign.findFirst({
      where: { historicalCountryId: castileHC.id, regnalNumber: 14 },
    })
    if (slot14Conflict) {
      // 이미 새 14대가 있는지 확인 (재실행 시)
      if (slot14Conflict.personId === charlesV.id) {
        console.log(`  ⏭️  14대 단독 reign 이미 존재 (스킵)`)
      } else {
        console.warn(`  ⚠️  14대 슬롯 충돌 — 다른 인물 점유 (skip)`)
      }
    } else {
      await prisma.sovereignReign.create({
        data: {
          personId: charlesV.id,
          historicalCountryId: castileHC.id,
          positionDefinitionId: kingPos.id,
          regnalNumber: 14,
          regnalName: '카를로스 1세',
          startDate: new Date(1555, 3, 12), // 1555-04-12 후아나 사망 직후 단독 군주
          endDate: new Date(1556, 0, 16), // 1556-01-16 아들 펠리페 2세에게 양위
          appointmentMethod: 'HEREDITARY' as any,
          endReason: 'ABDICATION' as any,
          endReasonDetail:
            '1556-01-16 아들 펠리페 2세에게 카스티야·아라곤·나폴리·시칠리아·사르데냐·이탈리아·신대륙 양위. 분할 양위의 두 번째 단계.',
          notes:
            '1555-04-12 어머니 후아나 1세 사망 후 약 9개월간 카스티야 단독 군주. 그 이전 1516-01-23부터 1555-04-12까지는 어머니와 jure matris 공동 군주(별도 NULL slot reign으로 등록). 1556-01-16 분할 양위로 아들 펠리페 2세(15대)에게 카스티야·아라곤·이탈리아·신대륙을 양위해 스페인 합스부르크 시대를 출발시켰다.',
          accountId: admin.id,
        },
      })
      console.log(
        `  ✅ 14대 카를로스 1세 단독 reign 생성 (1555-04-12 ~ 1556-01-16, ABDICATION)`,
      )
    }

    // 결과 확인
    console.log('\n=== 분리 후 카스티야 reign 라인 ===')
    const reigns = await prisma.sovereignReign.findMany({
      where: { historicalCountryId: castileHC.id },
      select: {
        regnalNumber: true,
        regnalName: true,
        startDate: true,
        endDate: true,
        person: { select: { originalName: true } },
      },
      orderBy: [{ startDate: 'asc' }],
    })
    for (const r of reigns) {
      const fmt = (d: Date | null) =>
        d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '?'
      console.log(
        `${String(r.regnalNumber ?? '공동').padStart(4)} | ${(r.regnalName ?? '?').padEnd(48)} | ${fmt(r.startDate)} ~ ${fmt(r.endDate)} | ${r.person.originalName}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('\n✨ 카를로스 reign 분리 완료\n'))
  .catch((e) => {
    console.error('❌', e)
    process.exit(1)
  })
