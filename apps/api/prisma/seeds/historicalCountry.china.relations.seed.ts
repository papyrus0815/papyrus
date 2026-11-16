import { TransitionEventType, TransitionScope } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 중국 계열 역사국가 계승 관계.
 *
 * - 청나라 → 중화민국: 1912-02-12 선통제 퇴위 조서가 주권을 넘겼다 → SUCCESSION.
 *   군주정→공화정 체제 전환이라 REGIME_CHANGE(로마 왕국→공화국 선례).
 * - 중화민국 → 중화인민공화국: 앞 나라가 대만에서 존속한 채 대륙에 새 나라가 섰다 → SPLIT / STATE_SUCCESSION
 *   ("잔존국 존속 + 일부 이탈" 규약 — 점령 독일→동/서독, 1922 아일랜드 분리 선례).
 *
 * 의존: 청나라(아편전쟁 시드)·중화민국(중화인민공화국 수립 사건 시드)·중화인민공화국(china 엔티티 시드).
 * 없으면 warn+skip — 재실행에서 채운다.
 */

interface TransitionEntry {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}

const TRANSITIONS: TransitionEntry[] = [
  {
    predecessor: '청나라',
    successor: '중화민국',
    eventType: TransitionEventType.SUCCESSION,
    transitionScope: TransitionScope.REGIME_CHANGE,
  },
  {
    predecessor: '중화민국',
    successor: '중화인민공화국',
    eventType: TransitionEventType.SPLIT,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
]

export async function seedChinaHistoricalCountryRelations(prisma: PrismaService): Promise<void> {
  console.log('\n🔗 중국 계열 역사 국가 계승 관계 시딩...')

  const names = [...new Set(TRANSITIONS.flatMap((transition) => [transition.predecessor, transition.successor]))]
  const rows = await prisma.historicalCountry.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  })
  const nameToId = new Map(rows.map((row) => [row.name, row.id]))
  for (const name of names) {
    if (!nameToId.has(name)) console.warn(`  ⚠️  역사 국가 미등록: ${name} — 관련 계승은 재실행에서 채움`)
  }

  let created = 0
  for (const transition of TRANSITIONS) {
    const predecessorId = nameToId.get(transition.predecessor)
    const successorId = nameToId.get(transition.successor)
    if (!predecessorId || !successorId) continue

    const exists = await prisma.historicalCountryTransition.findFirst({ where: { predecessorId, successorId } })
    if (exists) {
      console.log(`    ♻️  ${transition.predecessor} → ${transition.successor}`)
      continue
    }
    await prisma.historicalCountryTransition.create({
      data: {
        predecessorId,
        successorId,
        eventType: transition.eventType,
        transitionScope: transition.transitionScope,
      },
    })
    console.log(`    ✅ ${transition.predecessor} → ${transition.successor} (${transition.eventType})`)
    created++
  }

  console.log(`✅ 계승 관계 ${created}건 완료\n`)
}
