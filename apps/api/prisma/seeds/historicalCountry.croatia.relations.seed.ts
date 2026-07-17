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
  // 공국 → 왕국 (925 토미슬라브 국왕 즉위)
  { predecessor: '크로아티아 공국', successor: '크로아티아 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 왕국 → 헝가리 동군연합 (1102 콜로만 대관)
  { predecessor: '크로아티아 왕국', successor: '크로아티아 왕국 (헝가리 동군연합)', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 동군연합 → 합스부르크 (1527 체틴 의회 페르디난트 1세 선출)
  { predecessor: '크로아티아 왕국 (헝가리 동군연합)', successor: '크로아티아 왕국 (합스부르크)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 합스부르크 → 크로아티아-슬라보니아 (1868 나고드바)
  { predecessor: '크로아티아 왕국 (합스부르크)', successor: '크로아티아-슬라보니아 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 크로아티아-슬라보니아 → 유고슬라비아 합류 (1918)
  { predecessor: '크로아티아-슬라보니아 왕국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 달마티아 → 유고슬라비아 합류 (1918)
  { predecessor: '달마티아 왕국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 베네치아령 달마티아 → 오스트리아령 달마티아 왕국 (1797 캄포포르미오 조약, 1815 빈 회의 확정)
  { predecessor: '베네치아 공화국', successor: '달마티아 왕국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 두브로브니크 → 나폴레옹 병합 (1808)
  { predecessor: '두브로브니크 공화국', successor: '프랑스 제1제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 프랑스 일리리아 주 → 오스트리아 달마티아 왕국 (1815 빈 회의)
  { predecessor: '프랑스 제1제국', successor: '달마티아 왕국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 추축국 침공으로 유고슬라비아 분할 → NDH (1941)
  { predecessor: '유고슬라비아 왕국', successor: '크로아티아 독립국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // NDH 붕괴 → 사회주의 크로아티아 (1945)
  { predecessor: '크로아티아 독립국', successor: '크로아티아 사회주의 공화국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
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
  // 헝가리 왕관령 (1102~1868)
  { parent: '헝가리 왕국', member: '크로아티아 왕국 (헝가리 동군연합)', role: HistoricalMembershipRole.UNION },
  { parent: '헝가리 왕국', member: '크로아티아 왕국 (합스부르크)', role: HistoricalMembershipRole.UNION },
  { parent: '헝가리 왕국', member: '크로아티아-슬라보니아 왕국', role: HistoricalMembershipRole.UNION },
  // 합스부르크 제국 소속 (1804~1918)
  { parent: '오스트리아 제국', member: '크로아티아 왕국 (합스부르크)', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아 제국', member: '달마티아 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아-헝가리 제국', member: '크로아티아-슬라보니아 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아-헝가리 제국', member: '달마티아 왕국', role: HistoricalMembershipRole.UNION },
  // 두브로브니크의 종주권 — 소속 기간이 공화국 존속(1358~1808)과 달라 기간 명시
  //  · 헝가리 보호: 자다르 조약(1358-02-18) ~ 모하치 전투(1526-08-29)로 사실상 종료
  //  · 오스만 조공: 정기 조공 확립(1458) ~ 공화국 폐지(1808-01-31)
  { parent: '헝가리 왕국', member: '두브로브니크 공화국', role: HistoricalMembershipRole.PROTECTORATE, membershipStartDate: '1358-02-18', membershipEndDate: '1526-08-29' },
  { parent: '오스만 제국', member: '두브로브니크 공화국', role: HistoricalMembershipRole.VASSAL_STATE, membershipStartDate: '1458-01-01', membershipEndDate: '1808-01-31' },
  // NDH = 독일·이탈리아 괴뢰국
  { parent: '나치 독일 (제3제국)', member: '크로아티아 독립국', role: HistoricalMembershipRole.PROTECTORATE },
  // 유고슬라비아 연방 구성 공화국
  { parent: '유고슬라비아 사회주의 연방 공화국', member: '크로아티아 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
// membership(왕관령 소속 = 헝가리 사학 관점)과 별개로, 대등한 동군연합(크로아티아
// 사학 관점)을 수평 관계로 이중 표기 — 논쟁적 관계의 양쪽 관점을 모두 수용한다.
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 1102 콜로만 대관 ~ 1526 모하치 전투(러요시 2세 전사로 야기에우워 동군 종료)
  { subject: '헝가리 왕국', object: '크로아티아 왕국 (헝가리 동군연합)', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1102-01-01', endDate: '1526-08-29' },
  // 1527 체틴 의회(페르디난트 1세 선출) ~ 1868 나고드바 사보르 인준(9/24)으로 재편
  { subject: '헝가리 왕국', object: '크로아티아 왕국 (합스부르크)', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1527-01-01', endDate: '1868-09-24' },
]

export async function seedCroatiaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 크로아티아 역사 국가 계승·소속 관계 시딩 시작...')

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
    } else if (
      (m.membershipStartDate || m.membershipEndDate) &&
      !exists.membershipStartDate &&
      !exists.membershipEndDate
    ) {
      // 기간 백필 — 기존 행이 무기간일 때만 채움(사용자가 편집한 기간은 보존)
      await prisma.historicalCountryMembership.update({
        where: { id: exists.id },
        data: {
          membershipStartDate: m.membershipStartDate ? new Date(m.membershipStartDate) : undefined,
          membershipEndDate: m.membershipEndDate ? new Date(m.membershipEndDate) : undefined,
        },
      })
      console.log(`    📅 [${m.parent}] ← ${m.member} 기간 백필 (${m.membershipStartDate ?? '?'} ~ ${m.membershipEndDate ?? '?'})`)
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
