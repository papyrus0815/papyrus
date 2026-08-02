import { TransitionEventType, TransitionScope } from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // ── 중세 세르비아 계승 ────────────────────────────────────────────
  { predecessor: '라슈카 공국',       successor: '세르비아 왕국',                     eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '세르비아 왕국',     successor: '세르비아 제국',                     eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '세르비아 제국',     successor: '세르비아 전제공국',                 eventType: TransitionEventType.DISSOLVED,   transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 근대 세르비아 ────────────────────────────────────────────────
  { predecessor: '세르비아 전제공국', successor: '세르비아 공국',                     eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '세르비아 공국',     successor: '세르비아 왕국 (근대)',              eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.REGIME_CHANGE },

  // ── 유고슬라비아 계승 ────────────────────────────────────────────
  { predecessor: '세르비아 왕국 (근대)',              successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.UNION,        transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '세르비아-크로아티아-슬로베니아 왕국', successor: '유고슬라비아 왕국',                 eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '유고슬라비아 왕국',                 successor: '유고슬라비아 사회주의 연방 공화국',   eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '유고슬라비아 사회주의 연방 공화국',   successor: '유고슬라비아 연방 공화국',           eventType: TransitionEventType.DISSOLVED,   transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '유고슬라비아 연방 공화국',           successor: '세르비아 몬테네그로',               eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.REGIME_CHANGE },
  // 2006 몬테네그로 분리로 연합 해체 — 세르비아가 법적 계승국으로 존속(럼프 DISSOLVED, SFRY→유고연방공화국 동형).
  // 이탈 측 엣지(세르비아 몬테네그로→몬테네그로 공화국 INDEPENDENCE)는 montenegro relations 시드가 관리
  { predecessor: '세르비아 몬테네그로',               successor: '세르비아 공화국',                   eventType: TransitionEventType.DISSOLVED,   transitionScope: TransitionScope.STATE_SUCCESSION },
]

export async function seedSerbiaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 세르비아 역사 국가 계승 관계 시딩 시작...')

  for (const t of TRANSITIONS) {
    const predecessor = await prisma.historicalCountry.findFirst({
      where: { name: t.predecessor },
      select: { id: true },
    })
    const successor = await prisma.historicalCountry.findFirst({
      where: { name: t.successor },
      select: { id: true },
    })

    if (!predecessor) {
      console.warn(`  ⚠️  전임 국가를 찾을 수 없음: ${t.predecessor}`)
      continue
    }
    if (!successor) {
      console.warn(`  ⚠️  후임 국가를 찾을 수 없음: ${t.successor}`)
      continue
    }

    const existing = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId: predecessor.id, successorId: successor.id },
    })

    if (existing) {
      console.log(`  ⏭️  ${t.predecessor} → ${t.successor}`)
    } else {
      await prisma.historicalCountryTransition.create({
        data: {
          predecessorId: predecessor.id,
          successorId: successor.id,
          eventType: t.eventType,
          transitionScope: t.transitionScope,
        },
      })
      console.log(`  ✅ ${t.predecessor} → ${t.successor}`)
    }
  }

  console.log(`✅ 세르비아 역사 국가 계승 관계 시딩 완료 (${TRANSITIONS.length}건)\n`)
}
