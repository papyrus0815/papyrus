import { TransitionEventType, TransitionScope } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 헝가리(1918~) 계승 관계.
 *
 * 의존: 헝가리 왕국(인물 시드)·오스트리아-헝가리 제국·오스트리아 제1공화국(austria 시드)·
 * 세르비아-크로아티아-슬로베니아 왕국(유고 계열 시드) — 없으면 warn 후 그 줄만 건너뛰고, 재실행하면 채운다.
 *
 * 소속 관계는 두지 않는다 — 추축국·바르샤바 조약기구·코메콘이 역사국가로 등록돼 있지 않다.
 * 트리아농 분할 중 체코슬로바키아·루마니아 왕국 쪽은 이미 있어(헝가리 왕국 → 둘) 빠진 두 갈래만 더한다.
 */
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 1918-11: 이중 제국 이탈 + 군주정 → 공화정
  { predecessor: '오스트리아-헝가리 제국', successor: '헝가리 민주 공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '헝가리 왕국', successor: '헝가리 민주 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1919-03: 공산·사민 연합에 권력 이양
  { predecessor: '헝가리 민주 공화국', successor: '헝가리 소비에트 공화국', eventType: TransitionEventType.OTHER, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1919-08 붕괴 → 과도정부 → 1920-03 왕정 복원(섭정 호르티)
  { predecessor: '헝가리 소비에트 공화국', successor: '헝가리 왕국 (섭정기)', eventType: TransitionEventType.OTHER, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1946-02: 왕정 폐지
  { predecessor: '헝가리 왕국 (섭정기)', successor: '헝가리 제2공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1949-08: 소련식 헌법(루마니아 왕국 → 사회주의 공화국 전례와 같은 축)
  { predecessor: '헝가리 제2공화국', successor: '헝가리 인민공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1989-10: 체제 전환
  { predecessor: '헝가리 인민공화국', successor: '헝가리 제3공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 트리아농(1920) 분할 중 빠져 있던 두 갈래 — 보이보디나·크로아티아-슬라보니아, 부르겐란트(1921)
  { predecessor: '헝가리 왕국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '헝가리 왕국', successor: '오스트리아 제1공화국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
]

export async function seedHungaryHistoricalCountryRelations(prisma: PrismaService): Promise<void> {
  console.log('\n🔗 헝가리 역사 국가 계승 관계 시딩 시작...')

  const nameToId = new Map<string, string>()
  const allNames = new Set([
    ...TRANSITIONS.map((transition) => transition.predecessor),
    ...TRANSITIONS.map((transition) => transition.successor),
  ])
  for (const name of allNames) {
    const found = await prisma.historicalCountry.findFirst({ where: { name } })
    if (found) nameToId.set(name, found.id)
    else console.warn(`  ⚠️  찾을 수 없음: ${name}`)
  }

  let created = 0
  for (const transition of TRANSITIONS) {
    const predecessorId = nameToId.get(transition.predecessor)
    const successorId = nameToId.get(transition.successor)
    if (!predecessorId || !successorId) continue

    const exists = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId, successorId },
    })
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

  console.log(`\n✅ 헝가리 계승 관계 ${created}건 신규\n`)
}
