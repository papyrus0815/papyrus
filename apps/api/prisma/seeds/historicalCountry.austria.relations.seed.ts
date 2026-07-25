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
  // 변경백령 → 공국 (1156 특권 소칙서 승격)
  { predecessor: '오스트리아 변경백령', successor: '오스트리아 공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 공국 → 대공국 (1453 특권 대칙서 인준)
  { predecessor: '오스트리아 공국', successor: '오스트리아 대공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 대공국 → 오스트리아 제국 (1804 프란츠 2세 제국 선포)
  { predecessor: '오스트리아 대공국', successor: '오스트리아 제국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 신성로마제국 해체(1806) → 합스부르크 제위는 오스트리아 제국으로 지속
  { predecessor: '신성로마제국', successor: '오스트리아 제국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 오스트리아 제국 → 오스트리아-헝가리 (1867 대타협 재편)
  { predecessor: '오스트리아 제국', successor: '오스트리아-헝가리 제국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 오스트리아-헝가리 해체 → 제1공화국 (1918)
  { predecessor: '오스트리아-헝가리 제국', successor: '오스트리아 제1공화국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 제1공화국 → 연방국 (1934 오스트로파시즘 헌법, 동일 국가 내 정권 교체)
  { predecessor: '오스트리아 제1공화국', successor: '오스트리아 연방국', eventType: TransitionEventType.OTHER, transitionScope: TransitionScope.REGIME_CHANGE },
  // 연방국 → 나치 독일 병합 (1938 안슐루스)
  { predecessor: '오스트리아 연방국', successor: '나치 독일 (제3제국)', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 나치 독일 패망 → 독일에서 분리·4개국 점령 (1945)
  { predecessor: '나치 독일 (제3제국)', successor: '연합군 점령하 오스트리아', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 케른텐 공국 신설 (976: 바이에른 공국에서 카란타니아 분리·승격)
  { predecessor: '바이에른 공국', successor: '케른텐 공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 케른텐 공국 분할 (1918~1920: 대부분 오스트리아, 메자 계곡 등 → 유고슬라비아)
  { predecessor: '케른텐 공국', successor: '오스트리아 제1공화국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '케른텐 공국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 슈타이어마르크 공국 분할 (1918: 북부 → 오스트리아, 남부 → 유고슬라비아)
  { predecessor: '슈타이어마르크 공국', successor: '오스트리아 제1공화국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '슈타이어마르크 공국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// { parent, member, role, isLeadingMember }
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 신성로마제국 소속 (976~1806)
  { parent: '신성로마제국', member: '오스트리아 변경백령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '오스트리아 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '오스트리아 대공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '슈타이어마르크 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '케른텐 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '베로나 변경백령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 게오르겐베르크 협약(1186) 이후 오스트리아와 동군연합 (1192~)
  { parent: '오스트리아 공국', member: '슈타이어마르크 공국', role: HistoricalMembershipRole.UNION },
  // 베로나 변경백령의 관할 이동 (952~976 바이에른 공작 → 976~1077 케른텐 공작 겸임)
  { parent: '바이에른 공국', member: '베로나 변경백령', role: HistoricalMembershipRole.UNION },
  { parent: '케른텐 공국', member: '베로나 변경백령', role: HistoricalMembershipRole.UNION },
  // 합스부르크 세습령 이너 오스트리아 (케른텐 1335~, 슈타이어마르크 1282~)
  { parent: '오스트리아 대공국', member: '케른텐 공국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아 대공국', member: '슈타이어마르크 공국', role: HistoricalMembershipRole.UNION },
  // 독일 연방(1815~1866) — 오스트리아가 의장국
  { parent: '독일 연방', member: '오스트리아 제국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  // 합스부르크 왕관령 (1804~1867)
  { parent: '오스트리아 제국', member: '헝가리 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아 제국', member: '보헤미아 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아 제국', member: '슈타이어마르크 공국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아 제국', member: '케른텐 공국', role: HistoricalMembershipRole.UNION },
  // 이중 제국 구성 (1867~1918)
  { parent: '오스트리아-헝가리 제국', member: '헝가리 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아-헝가리 제국', member: '보헤미아 왕국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아-헝가리 제국', member: '슈타이어마르크 공국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아-헝가리 제국', member: '케른텐 공국', role: HistoricalMembershipRole.UNION },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 게오르겐베르크 협약(1186) 발효 = 오타카르 4세 사망(1192-05-08) ~
  // 노이베르크 조약(1379-09-25)으로 알베르트(오스트리아)·레오폴트(이너 오스트리아) 분지 분할되어 동군 해소
  { subject: '오스트리아 공국', object: '슈타이어마르크 공국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1192-05-08', endDate: '1379-09-25' },
]

export async function seedAustriaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 오스트리아 역사 국가 계승·소속 관계 시딩 시작...')

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
