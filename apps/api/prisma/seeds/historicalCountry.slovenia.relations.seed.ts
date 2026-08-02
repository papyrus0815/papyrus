import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// 카란타니아 공국(→프랑크 왕국·케른텐 공국)의 계승은 austria relations 시드에서 관리한다.
// 슬로베니아 사회주의 공화국은 incoming 계승이 없다 — 유고 왕국→SFRY가 REGIME_CHANGE 연속이라
// 구성 공화국을 유고 왕국에서 SPLIT시키면 모순이고, 크로아티아의 NDH 같은 중간 노드도 없다(소속으로 표현).
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 아퀼레이아 세속권 상실 (1420 베네치아의 프리울리 정복)
  { predecessor: '아퀼레이아 총대주교령', successor: '베네치아 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 일리리아 주 왕복 엣지 (역방향 쌍은 체코슬로바키아↔보헤미아-모라바 보호령 선례)
  // 1809 쇤브룬 조약 할양 → 1813 재점령·1815 빈 회의 확정 반환
  { predecessor: '오스트리아 제국', successor: '일리리아 주', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '일리리아 주', successor: '오스트리아 제국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 카르니올라 해체 (1918: 대부분 SHS 왕국 귀속, 케른텐·슈타이어마르크 SPLIT 이중 엣지 선례)
  { predecessor: '카르니올라 공국', successor: '세르비아-크로아티아-슬로베니아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 서부 내카르니올라 → 이탈리아 (1920 라팔로 조약)
  { predecessor: '카르니올라 공국', successor: '이탈리아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 사회주의 공화국 → 독립 공화국 (동일 정체 존속+체제 전환 — 러시아 공화국→러시아SFSR SUCCESSION/REGIME_CHANGE 선례.
  // INDEPENDENCE는 corpus상 "모국→이탈 신생국" 방향 전용이라 자기 전신에는 쓰지 않는다)
  { predecessor: '슬로베니아 사회주의 공화국', successor: '슬로베니아 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 연방 이탈 독립 (1991 — 오헝→체코슬로바키아 INDEPENDENCE 동형. 럼프 엣지 SFRY→유고연방공화국 DISSOLVED와 역할 분담)
  { predecessor: '유고슬라비아 사회주의 연방 공화국', successor: '슬로베니아 공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 신성로마제국 소속 (카르니올라 1364~1806, 아퀼레이아 1077~1420)
  { parent: '신성로마제국', member: '카르니올라 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '신성로마제국', member: '아퀼레이아 총대주교령', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 프랑스 제국의 특별 행정구 (1809~1813 — 합스부르크 왕관령 UNION 유추)
  { parent: '프랑스 제1제국', member: '일리리아 주', role: HistoricalMembershipRole.UNION },
  // 합스부르크 세습령 이너 오스트리아 (케른텐·슈타이어마르크와 같은 UNION 선례)
  { parent: '오스트리아 대공국', member: '카르니올라 공국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아 제국', member: '카르니올라 공국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아-헝가리 제국', member: '카르니올라 공국', role: HistoricalMembershipRole.UNION },
  // 유고슬라비아 연방 구성 공화국 (크로아티아 사회주의 공화국 선례)
  { parent: '유고슬라비아 사회주의 연방 공화국', member: '슬로베니아 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
]

export async function seedSloveniaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 슬로베니아 역사 국가 계승·소속 관계 시딩 시작...')

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
