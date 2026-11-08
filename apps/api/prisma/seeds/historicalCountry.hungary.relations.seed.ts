import { HistoricalMembershipRole, TransitionEventType, TransitionScope } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 헝가리(1918~) 계승 관계.
 *
 * 의존: 헝가리 왕국(인물 시드)·오스트리아-헝가리 제국·오스트리아 제1공화국(austria 시드)·
 * 세르비아-크로아티아-슬로베니아 왕국(유고 계열 시드) — 없으면 warn 후 그 줄만 건너뛰고, 재실행하면 채운다.
 *
 * 소속 관계는 국민통합정부 → 나치 독일(PROTECTORATE, 크로아티아 독립국 전례) 하나뿐 —
 * 추축국·바르샤바 조약기구·코메콘은 역사국가로 등록돼 있지 않다.
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
  // 1944-10: 호르티 휴전 시도 → 독일이 퇴진시키고 살러시 옹립
  { predecessor: '헝가리 왕국 (섭정기)', successor: '헝가리 국민통합정부', eventType: TransitionEventType.OTHER, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1945-03 붕괴 → (데브레첸 임시 국민정부) → 1946 공화국. 섭정기 왕국으로 되돌리면 계승 그래프에 순환이 생겨 공화국으로 잇는다
  { predecessor: '헝가리 국민통합정부', successor: '헝가리 제2공화국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.REGIME_CHANGE },
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

const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
}[] = [
  { parent: '나치 독일 (제3제국)', member: '헝가리 국민통합정부', role: HistoricalMembershipRole.PROTECTORATE },
]

export async function seedHungaryHistoricalCountryRelations(prisma: PrismaService): Promise<void> {
  console.log('\n🔗 헝가리 역사 국가 계승 관계 시딩 시작...')

  const nameToId = new Map<string, string>()
  const allNames = new Set([
    ...TRANSITIONS.map((transition) => transition.predecessor),
    ...TRANSITIONS.map((transition) => transition.successor),
    ...MEMBERSHIPS.map((membership) => membership.parent),
    ...MEMBERSHIPS.map((membership) => membership.member),
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

  let membershipCreated = 0
  for (const membership of MEMBERSHIPS) {
    const parentId = nameToId.get(membership.parent)
    const memberId = nameToId.get(membership.member)
    if (!parentId || !memberId) continue
    const exists = await prisma.historicalCountryMembership.findFirst({
      where: { historicalCountryId: parentId, memberCountryId: memberId },
    })
    if (exists) {
      console.log(`    ♻️  [${membership.parent}] ← ${membership.member}`)
      continue
    }
    await prisma.historicalCountryMembership.create({
      data: { historicalCountryId: parentId, memberCountryId: memberId, role: membership.role },
    })
    console.log(`    ✅ [${membership.parent}] ← ${membership.member} (${membership.role})`)
    membershipCreated++
  }

  console.log(`\n✅ 헝가리 계승 관계 ${created}건 · 소속 관계 ${membershipCreated}건 신규\n`)
}
