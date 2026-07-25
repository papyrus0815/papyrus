import {
  HistoricalMembershipRole,
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
  // 게르만 → 프랑크
  { predecessor: '게르마니아', successor: '프랑크 왕국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 프랑크 분열
  { predecessor: '프랑크 왕국', successor: '동프랑크 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 동프랑크 → 신성로마제국 / 독일 왕국
  { predecessor: '동프랑크 왕국', successor: '신성로마제국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '동프랑크 왕국', successor: '독일 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 브란덴부르크 → 브란덴부르크-프로이센
  { predecessor: '브란덴부르크 선제후국', successor: '브란덴부르크-프로이센', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 프로이센 공국 → 브란덴부르크-프로이센
  { predecessor: '프로이센 공국', successor: '브란덴부르크-프로이센', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 브란덴부르크-프로이센 → 프로이센 왕국
  { predecessor: '브란덴부르크-프로이센', successor: '프로이센 왕국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 신성로마제국 해체 → 라인 연방 / 프로이센 왕국 계속
  { predecessor: '신성로마제국', successor: '라인 연방', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '신성로마제국', successor: '프로이센 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 헤센-카셀 → 헤센 선제후국
  { predecessor: '헤센-카셀 방백령', successor: '헤센 선제후국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 헤센-다름슈타트 → 헤센 대공국
  { predecessor: '헤센-다름슈타트 방백령', successor: '헤센 대공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 바덴 변경백령 → 바덴 대공국
  { predecessor: '바덴 변경백령', successor: '바덴 대공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 뷔르템베르크 공국 → 뷔르템베르크 왕국
  { predecessor: '뷔르템베르크 공국', successor: '뷔르템베르크 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 슈바벤 공국 분열 (1112 체링겐 가문이 바덴으로 분리, 1268 소멸 후 뷔르템베르크가 계승)
  { predecessor: '슈바벤 공국', successor: '바덴 변경백령', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '슈바벤 공국', successor: '뷔르템베르크 공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 바이에른 공국 → 바이에른 선제후국
  { predecessor: '바이에른 공국', successor: '바이에른 선제후국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 작센 공국 → 작센 선제후국 (1296 작센-비텐베르크 분할 → 1356 금인칙서로 선제후 지위)
  { predecessor: '작센 공국', successor: '작센 선제후국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 마이센 변경백령 → 작센 선제후국 (1423 베틴 가문의 선제후 지위 획득)
  { predecessor: '마이센 변경백령', successor: '작센 선제후국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 바이에른 선제후국 → 바이에른 왕국
  { predecessor: '바이에른 선제후국', successor: '바이에른 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 작센 선제후국 → 작센 왕국
  { predecessor: '작센 선제후국', successor: '작센 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 하노버 선제후국 → 하노버 왕국
  { predecessor: '하노버 선제후국', successor: '하노버 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 라인 연방 해체 → 독일 연방
  { predecessor: '라인 연방', successor: '독일 연방', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 하노버 왕국 → 프로이센에 병합 (독일 연방 해체 후)
  { predecessor: '하노버 왕국', successor: '독일 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 헤센 선제후국 → 프로이센에 병합
  { predecessor: '헤센 선제후국', successor: '독일 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 독일 연방 → 북독일 연방
  { predecessor: '독일 연방', successor: '북독일 연방', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 북독일 연방 → 독일 제국
  { predecessor: '북독일 연방', successor: '독일 제국', eventType: TransitionEventType.UNIFICATION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 바이에른·뷔르템베르크·작센·헤센·바덴 → 독일 제국 합류
  { predecessor: '바이에른 왕국', successor: '독일 제국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '뷔르템베르크 왕국', successor: '독일 제국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '작센 왕국', successor: '독일 제국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '헤센 대공국', successor: '독일 제국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '바덴 대공국', successor: '독일 제국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 독일 제국 → 바이마르 공화국
  { predecessor: '독일 제국', successor: '바이마르 공화국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 바이마르 → 나치 독일
  { predecessor: '바이마르 공화국', successor: '나치 독일 (제3제국)', eventType: TransitionEventType.OTHER, transitionScope: TransitionScope.REGIME_CHANGE },
  // 나치 독일 → 연합군 점령
  { predecessor: '나치 독일 (제3제국)', successor: '연합군 점령하 독일', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 연합군 점령 → 동독·서독 분열
  { predecessor: '연합군 점령하 독일', successor: '독일 민주 공화국 (동독)', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '연합군 점령하 독일', successor: '독일 연방 공화국 (서독)', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// { parent, member, role, isLeadingMember }
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 신성로마제국 소속 제후국들
  { parent: '신성로마제국', member: '브란덴부르크 선제후국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '작센 선제후국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '팔츠 선제후국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '마이센 변경백령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '작센 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '슈바벤 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '프랑켄 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 부족공국 시기(843~962)는 동프랑크 왕국 소속
  { parent: '동프랑크 왕국', member: '작센 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '동프랑크 왕국', member: '슈바벤 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '동프랑크 왕국', member: '프랑켄 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '바이에른 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '바이에른 선제후국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '하노버 선제후국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '헤센-카셀 방백령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '헤센-다름슈타트 방백령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '뷔르템베르크 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '바덴 변경백령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '뮌스터 주교령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '독일 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '신성로마제국', member: '프로이센 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 라인 연방 소속
  { parent: '라인 연방', member: '바이에른 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '라인 연방', member: '뷔르템베르크 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '라인 연방', member: '헤센 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '라인 연방', member: '바덴 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '라인 연방', member: '베스트팔렌 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 독일 연방 소속
  { parent: '독일 연방', member: '프로이센 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '독일 연방', member: '바이에른 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '뷔르템베르크 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '작센 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '하노버 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '헤센 선제후국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '헤센 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 연방', member: '바덴 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 북독일 연방 소속
  { parent: '북독일 연방', member: '프로이센 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '북독일 연방', member: '작센 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 독일 제국 소속
  { parent: '독일 제국', member: '프로이센 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '독일 제국', member: '바이에른 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 제국', member: '뷔르템베르크 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 제국', member: '작센 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 제국', member: '헤센 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '독일 제국', member: '바덴 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
]

export async function seedGermanyHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 독일 역사 국가 계승·소속 관계 시딩 시작...')

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
