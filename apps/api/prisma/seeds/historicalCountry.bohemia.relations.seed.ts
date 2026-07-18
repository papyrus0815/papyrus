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
  // 대모라비아 붕괴 후 보헤미아 분지의 패권 승계
  { predecessor: '대모라비아 왕국', successor: '보헤미아 공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 공국 → 왕국 (1198 오타카르 1세 세습 왕위)
  { predecessor: '보헤미아 공국', successor: '보헤미아 왕국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1918 체코슬로바키아 성립 — 왕관령 두 축의 합류 + 3제국 해체 독립
  { predecessor: '보헤미아 왕국', successor: '체코슬로바키아', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '모라비아 변경백령', successor: '체코슬로바키아', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '오스트리아-헝가리 제국', successor: '체코슬로바키아', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '헝가리 왕국', successor: '체코슬로바키아', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1939 나치 독일의 잔여 체코 점령 → 보호령
  { predecessor: '체코슬로바키아', successor: '보헤미아-모라바 보호령', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1945 해방 — 체코슬로바키아 재건
  { predecessor: '보헤미아-모라바 보호령', successor: '체코슬로바키아', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
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
  // 신성로마제국 제후국 — 공국은 11세기 초 편입, 왕국은 1806 제국 해체까지
  { parent: '신성로마제국', member: '보헤미아 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, membershipStartDate: '1002-01-01' },
  { parent: '신성로마제국', member: '보헤미아 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, membershipEndDate: '1806-08-06' },
  // 보헤미아 왕관령 — 1348 카렐 4세 칙서로 모라비아 편입
  { parent: '보헤미아 왕국', member: '모라비아 변경백령', role: HistoricalMembershipRole.UNION, membershipStartDate: '1348-04-07' },
  // 합스부르크 제국 소속 (1804 제국 선포 ~ 1918)
  { parent: '오스트리아 제국', member: '보헤미아 왕국', role: HistoricalMembershipRole.UNION, membershipStartDate: '1804-08-11', membershipEndDate: '1867-06-08' },
  { parent: '오스트리아-헝가리 제국', member: '보헤미아 왕국', role: HistoricalMembershipRole.UNION, membershipStartDate: '1867-06-08', membershipEndDate: '1918-10-28' },
  // 보호령 = 나치 독일 종속
  { parent: '나치 독일 (제3제국)', member: '보헤미아-모라바 보호령', role: HistoricalMembershipRole.PROTECTORATE },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
// 보헤미아 왕관을 둘러싼 왕조 교차 — 프르셰미슬·야기에우워·합스부르크 동군연합
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 프르셰미슬 동군연합: 바츨라프 2세의 폴란드 왕 대관(1300) ~ 바츨라프 3세 암살(1306-08-04)
  { subject: '보헤미아 왕국', object: '폴란드 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1300-01-01', endDate: '1306-08-04' },
  // 야기에우워 동군연합: 블라디슬라프 2세의 헝가리 왕 즉위(1490-07-15) ~ 모하치 전투(1526-08-29)
  { subject: '헝가리 왕국', object: '보헤미아 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1490-07-15', endDate: '1526-08-29' },
  // 합스부르크 동군연합: 페르디난트 1세 보헤미아 왕 선출(1526-10-23) ~ 오스트리아 제국 선포(1804-08-11)
  { subject: '오스트리아 대공국', object: '보헤미아 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1526-10-23', endDate: '1804-08-11' },
]

export async function seedBohemiaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 보헤미아 역사 국가 계승·소속 관계 시딩 시작...')

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
