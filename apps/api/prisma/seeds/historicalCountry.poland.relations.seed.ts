import {
  HistoricalMembershipRole,
  HistoricalRelationType,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// { predecessor, successor, eventType, transitionScope }
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 공국 → 왕국 (1025 볼레스와프 1세 대관)
  { predecessor: '폴란드 공국', successor: '폴란드 왕국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 루블린 연합 (1569) — 왕국·대공국이 결합해 연방 성립
  { predecessor: '폴란드 왕국', successor: '폴란드-리투아니아 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '리투아니아 대공국', successor: '폴란드-리투아니아 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 3차 분할 (1772·1793·1795) — 러시아·프로이센·합스부르크가 분할 병합
  { predecessor: '폴란드-리투아니아 연방', successor: '러시아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '폴란드-리투아니아 연방', successor: '프로이센 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '폴란드-리투아니아 연방', successor: '오스트리아 대공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 나폴레옹의 국민적 재건 (1807 틸지트)
  { predecessor: '폴란드-리투아니아 연방', successor: '바르샤바 공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 빈 회의 (1815) — 공국 해체 후 입헌왕국·자유시로 재편
  { predecessor: '바르샤바 공국', successor: '폴란드 입헌왕국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '바르샤바 공국', successor: '크라쿠프 자유시', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 크라쿠프 봉기 → 오스트리아 병합 (1846)
  { predecessor: '크라쿠프 자유시', successor: '오스트리아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1월 봉기 진압 후 러시아 직할 편입 (1867 비스와 지방)
  { predecessor: '폴란드 입헌왕국', successor: '러시아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1918 독립 회복 — 분할 3제국에서 독립
  { predecessor: '러시아 제국', successor: '폴란드 제2공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '독일 제국', successor: '폴란드 제2공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '오스트리아-헝가리 제국', successor: '폴란드 제2공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1939 독소 분할 점령
  { predecessor: '폴란드 제2공화국', successor: '나치 독일 (제3제국)', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '폴란드 제2공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 전후 사회주의 국가 수립 (1944 루블린 위원회)
  { predecessor: '폴란드 제2공화국', successor: '폴란드 인민공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// { parent, member, role, isLeadingMember }
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
  /** 소속 기간이 하위 국가의 존속 기간과 다를 때만 기입 (ISO 날짜) */
  membershipStartDate?: string
  membershipEndDate?: string
}[] = [
  // 연방의 두 축 — 대공국은 존속 기간(1236~1795)과 소속 기간(1569~)이 달라 기간 명시
  { parent: '폴란드-리투아니아 연방', member: '리투아니아 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, membershipStartDate: '1569-07-01', membershipEndDate: '1795-10-24' },
  // 바르샤바 공국 = 나폴레옹 위성국
  { parent: '프랑스 제1제국', member: '바르샤바 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 입헌왕국 = 러시아 차르 겸위 왕관령
  { parent: '러시아 제국', member: '폴란드 입헌왕국', role: HistoricalMembershipRole.UNION },
  // 크라쿠프 자유시 = 분할 3국 공동 보호
  { parent: '러시아 제국', member: '크라쿠프 자유시', role: HistoricalMembershipRole.PROTECTORATE },
  { parent: '오스트리아 제국', member: '크라쿠프 자유시', role: HistoricalMembershipRole.PROTECTORATE },
  { parent: '프로이센 왕국', member: '크라쿠프 자유시', role: HistoricalMembershipRole.PROTECTORATE },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
// 폴란드사 왕조 교차의 핵심 — 앙주·야기에우워·베틴 동군연합을 수평 관계로 표기
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 앙주 동군연합: 러요시 1세(루드비크)의 폴란드 왕 대관(1370-11-17) ~ 사망(1382-09-10)
  { subject: '헝가리 왕국', object: '폴란드 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1370-11-17', endDate: '1382-09-10' },
  // 야기에우워 동군연합: 요가일라의 폴란드 왕 대관(1386-03-04) ~ 루블린 연합(1569-07-01)
  { subject: '폴란드 왕국', object: '리투아니아 대공국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1386-03-04', endDate: '1569-07-01' },
  // 베틴(작센) 동군연합: 아우구스트 2세 즉위(1697-09-15) ~ 아우구스트 3세 사망(1763-10-05), 1706~1709 중단 포함
  { subject: '작센 선제후국', object: '폴란드-리투아니아 연방', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1697-09-15', endDate: '1763-10-05' },
  // 작센 왕 프리드리히 아우구스트 1세의 바르샤바 공작 겸위 (1807 틸지트 ~ 1815 빈 회의)
  { subject: '작센 왕국', object: '바르샤바 공국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1807-07-22', endDate: '1815-06-09' },
]

export async function seedPolandHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 폴란드 역사 국가 계승·소속 관계 시딩 시작...')

  // 이름 → id 맵 구축
  const nameToId = new Map<string, string>()
  const allNames = new Set([
    ...TRANSITIONS.map((t) => t.predecessor),
    ...TRANSITIONS.map((t) => t.successor),
    ...MEMBERSHIPS.map((m) => m.parent),
    ...MEMBERSHIPS.map((m) => m.member),
    ...RELATIONS.map((r) => r.subject),
    ...RELATIONS.map((r) => r.object),
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
          membershipStartDate: m.membershipStartDate ? new Date(m.membershipStartDate) : undefined,
          membershipEndDate: m.membershipEndDate ? new Date(m.membershipEndDate) : undefined,
        },
      })
      console.log(`    ✅ [${m.parent}] ← ${m.member}${m.isLeadingMember ? ' (주축)' : ''}`)
      membershipCount++
    } else {
      console.log(`    ♻️  [${m.parent}] ← ${m.member}`)
    }
  }

  // ── 수평 관계(동군연합) ────────────────────────────────────────────
  console.log('\n  👑 수평 관계(동군연합) 등록...')
  let relationCount = 0
  for (const r of RELATIONS) {
    const subjectCountryId = nameToId.get(r.subject)
    const objectCountryId = nameToId.get(r.object)
    if (!subjectCountryId || !objectCountryId) continue

    const exists = await prisma.historicalCountryRelation.findFirst({
      where: { subjectCountryId, objectCountryId, relationType: r.relationType },
    })
    if (!exists) {
      await prisma.historicalCountryRelation.create({
        data: {
          subjectCountryId,
          objectCountryId,
          relationType: r.relationType,
          startDate: r.startDate ? new Date(r.startDate) : undefined,
          endDate: r.endDate ? new Date(r.endDate) : undefined,
        },
      })
      console.log(`    ✅ ${r.subject} ↔ ${r.object} (${r.relationType})`)
      relationCount++
    } else {
      console.log(`    ♻️  ${r.subject} ↔ ${r.object}`)
    }
  }

  console.log(`\n✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건, 수평 관계 ${relationCount}건 완료\n`)
}
