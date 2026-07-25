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
  // 칼마르 동맹 → 덴마크-노르웨이 (1523 스웨덴 이탈 후 두 왕국만 존속)
  { predecessor: '칼마르 동맹', successor: '덴마크-노르웨이', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 덴마크-노르웨이 해체 (1814 킬 조약: 노르웨이 상실, 덴마크 왕국은 존속)
  { predecessor: '덴마크-노르웨이', successor: '덴마크 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 슐레스비히·홀슈타인 공국 → 프로이센 병합 (1864 제2차 슐레스비히 전쟁 → 1866 병합)
  { predecessor: '슐레스비히 공국', successor: '프로이센 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '홀슈타인 공국', successor: '프로이센 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// { parent, member, role, isLeadingMember }
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 칼마르 동맹 구성 (1397~1523) — 덴마크가 주도. 스웨덴 왕국은 별도 지역 시드 대상이라 여기선 생략
  { parent: '칼마르 동맹', member: '덴마크 왕국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '칼마르 동맹', member: '노르웨이 왕국', role: HistoricalMembershipRole.UNION },
  // 덴마크-노르웨이 이중 왕국 구성 (1537~1814)
  { parent: '덴마크-노르웨이', member: '덴마크 왕국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '덴마크-노르웨이', member: '노르웨이 왕국', role: HistoricalMembershipRole.UNION },
  // 슐레스비히는 덴마크 왕국의 봉토, 홀슈타인은 신성로마제국(→독일 연방)의 봉토
  { parent: '덴마크 왕국', member: '슐레스비히 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '신성로마제국', member: '홀슈타인 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '홀슈타인 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 리베 조약(1460): 슐레스비히·홀슈타인 "영원히 나뉘지 않는다" — 덴마크 국왕 아래 동군연합
  { subject: '슐레스비히 공국', object: '홀슈타인 공국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1460-03-05', endDate: '1864-10-30' },
]

export async function seedDenmarkHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 덴마크 역사 국가 계승·소속 관계 시딩 시작...')

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
