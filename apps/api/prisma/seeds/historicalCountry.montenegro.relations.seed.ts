import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// 세르비아 몬테네그로→세르비아 공화국(럼프 존속) 엣지는 serbia relations 시드가 관리한다.
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 보이슬라브 봉기로 동로마에서 이탈 (1040)
  { predecessor: '동로마 제국', successor: '두클랴', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 스테판 네마냐의 병합 (1186 — 라슈카 공국 768~1217)
  { predecessor: '두클랴', successor: '라슈카 공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 세르비아 제국 와해로 갈라진 영주국들 중 하나 (1371 — 럼프 몫 DISSOLVED는 →세르비아 전제공국에 기배정)
  { predecessor: '세르비아 제국', successor: '제타 공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 오스만의 저지대 정복 (1496)
  { predecessor: '제타 공국', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 츠르노예비치 잔여 세력 → 블라디카 신정 이행 (1496→1516 갭 20년 단순화)
  { predecessor: '제타 공국', successor: '몬테네그로 주교후국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 다닐로의 세속화 (1852)
  { predecessor: '몬테네그로 주교후국', successor: '몬테네그로 공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 왕국 승격 (1910 — 세르비아·불가리아 공국→왕국 선례)
  { predecessor: '몬테네그로 공국', successor: '몬테네그로 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 포드고리차 의회의 통합 결의로 SHS 흡수 (1918-11 — 동루멜리아→불가리아 공국 UNION 동형)
  { predecessor: '몬테네그로 왕국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 정체 연속 (1992~2006 연방 잔류기 14년 갭 단순화 — 그 시기는 유고연방공화국·세르비아 몬테네그로 행의 ME 링크가 담당)
  { predecessor: '몬테네그로 사회주의 공화국', successor: '몬테네그로 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 국민투표 이탈 독립 (2006 — 오헝 해체 패턴의 이탈 INDEPENDENCE)
  { predecessor: '세르비아 몬테네그로', successor: '몬테네그로 공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 오스만의 명목 종주권(16~17세기 간헐 공납, 1697 이후 사실상 독립·산악 실효 미복속) —
  // 1878 베를린 조약의 '독립 승인'이 전제하는 법적 상태. 순수 명목 종주권만으로 부여된
  // 오스만←불가리아 공국 VASSAL_STATE 선례와 동형
  { parent: '오스만 제국', member: '몬테네그로 주교후국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 유고슬라비아 연방 구성 공화국 (슬사공·크사공 선례)
  { parent: '유고슬라비아 사회주의 연방 공화국', member: '몬테네그로 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
]

export async function seedMontenegroHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 몬테네그로 역사 국가 계승·소속 관계 시딩 시작...')

  // 이름 → id 맵 구축
  const nameToId = new Map<string, string>()
  const allNames = new Set([
    ...TRANSITIONS.map((t) => t.predecessor),
    ...TRANSITIONS.map((t) => t.successor),
    ...MEMBERSHIPS.map((m) => m.parent),
    ...MEMBERSHIPS.map((m) => m.member),
  ])
  for (const name of allNames) {
    const found = await prisma.historicalCountry.findFirst({ where: { name } })
    if (found) nameToId.set(name, found.id)
    else console.warn(`  ⚠️  찾을 수 없음: ${name}`)
  }

  // ── 계승 관계 ──────────────────────────────────────────────────────
  console.log('\n  📜 계승 관계 등록...')
  let transitionCount = 0
  for (const t of TRANSITIONS) {
    const predecessorId = nameToId.get(t.predecessor)
    const successorId = nameToId.get(t.successor)
    if (!predecessorId || !successorId) continue

    const exists = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId, successorId },
    })
    if (!exists) {
      await prisma.historicalCountryTransition.create({
        data: {
          predecessorId,
          successorId,
          eventType: t.eventType,
          transitionScope: t.transitionScope,
        },
      })
      console.log(`    ✅ ${t.predecessor} → ${t.successor} (${t.eventType})`)
      transitionCount++
    } else {
      console.log(`    ♻️  ${t.predecessor} → ${t.successor}`)
    }
  }

  // ── 소속 관계 ──────────────────────────────────────────────────────
  console.log('\n  🏛️  소속 관계 등록...')
  let membershipCount = 0
  for (const m of MEMBERSHIPS) {
    const parentId = nameToId.get(m.parent)
    const memberId = nameToId.get(m.member)
    if (!parentId || !memberId) continue

    const exists = await prisma.historicalCountryMembership.findFirst({
      where: {
        historicalCountryId: parentId,
        memberCountryId: memberId,
      },
    })
    if (!exists) {
      await prisma.historicalCountryMembership.create({
        data: {
          historicalCountryId: parentId,
          memberCountryId: memberId,
          role: m.role,
          isLeadingMember: m.isLeadingMember ?? false,
        },
      })
      console.log(`    ✅ [${m.parent}] ← ${m.member}${m.isLeadingMember ? ' (주축)' : ''}`)
      membershipCount++
    } else {
      console.log(`    ♻️  [${m.parent}] ← ${m.member}`)
    }
  }

  console.log(`\n✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건 완료\n`)
}
