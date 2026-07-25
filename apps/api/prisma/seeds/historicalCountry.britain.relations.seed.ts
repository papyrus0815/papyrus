import {
  HistoricalMembershipRole,
  HistoricalRelationType,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 앵글로색슨 → 잉글랜드 왕국
  { predecessor: '웨식스 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNIFICATION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '머시아 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '노섬브리아 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '이스트앵글리아 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '켄트 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // 아일랜드 영주권 → 아일랜드 왕국
  { predecessor: '아일랜드 영주권', successor: '아일랜드 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // 잉글랜드 + 스코틀랜드 → 그레이트브리튼 왕국 (1707 합방)
  { predecessor: '잉글랜드 왕국', successor: '그레이트브리튼 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '스코틀랜드 왕국', successor: '그레이트브리튼 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // 그레이트브리튼 + 아일랜드 → 연합왕국 (1801 합방)
  { predecessor: '그레이트브리튼 왕국', successor: '그레이트브리튼 및 아일랜드 연합왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아일랜드 왕국', successor: '그레이트브리튼 및 아일랜드 연합왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // 서식스·에식스 왕국 → 잉글랜드 왕국 (7왕국 통합, 웨식스 매개 최종 계승)
  { predecessor: '서식스 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '에식스 왕국', successor: '잉글랜드 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // 잉글랜드 왕국 ↔ 잉글랜드 연방 (1649 공화정 수립 / 1660 왕정복고 — 동일 영토 체제 전환)
  { predecessor: '잉글랜드 왕국', successor: '잉글랜드 연방', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '잉글랜드 연방', successor: '잉글랜드 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },

  // 그레이트브리튼 및 아일랜드 연합왕국 → 현대 영국 (1922 아일랜드 자유국 분리, UK 존속·개명)
  { predecessor: '그레이트브리튼 및 아일랜드 연합왕국', successor: '그레이트브리튼 및 북아일랜드 연합왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
]

const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 그레이트브리튼 왕국 구성
  { parent: '그레이트브리튼 왕국', member: '잉글랜드 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '그레이트브리튼 왕국', member: '스코틀랜드 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },

  // 연합왕국 구성
  { parent: '그레이트브리튼 및 아일랜드 연합왕국', member: '그레이트브리튼 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '그레이트브리튼 및 아일랜드 연합왕국', member: '아일랜드 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },

  // 웨일스 → 잉글랜드 왕국 소속
  { parent: '잉글랜드 왕국', member: '웨일스 공국', role: HistoricalMembershipRole.VASSAL_STATE },

  // 아일랜드 영주권 → 잉글랜드 왕국 소속
  { parent: '잉글랜드 왕국', member: '아일랜드 영주권', role: HistoricalMembershipRole.VASSAL_STATE },

  // 서식스·에식스는 8세기 머시아, 이후 웨식스의 종주권 아래 속국(825~827 흡수)
  { parent: '머시아 왕국', member: '서식스 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '웨식스 왕국', member: '서식스 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '머시아 왕국', member: '에식스 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '웨식스 왕국', member: '에식스 왕국', role: HistoricalMembershipRole.VASSAL_STATE },

  // 잉글랜드 연방(1649~1660)이 정복·병합해 실효 지배한 스코틀랜드·아일랜드 (1660 왕정복고로 해소)
  { parent: '잉글랜드 연방', member: '스코틀랜드 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '잉글랜드 연방', member: '아일랜드 왕국', role: HistoricalMembershipRole.UNION },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 왕관연합(Union of the Crowns): 제임스 6세의 잉글랜드 왕위 계승(1603-03-24) ~
  // 연합법 발효(1707-05-01)로 그레이트브리튼 왕국으로 합방
  { subject: '잉글랜드 왕국', object: '스코틀랜드 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1603-03-24', endDate: '1707-05-01' },
]

export async function seedBritainHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 영국 역사 국가 계승·소속 관계 시딩 시작...')

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
      where: { historicalCountryId: parentId, memberCountryId: memberId },
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

  // ── 수평 관계(동군연합) ──────────────────────────────────
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
