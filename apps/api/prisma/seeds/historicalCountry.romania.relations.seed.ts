import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// 몰다비아 소비에트 사회주의 공화국(1940~1991)·소비에트 사회주의 공화국 연방·러시아 제국은
// 러시아 계열 시드 유래 노드 — 이름 기반 조회라 없으면 warn+skip.
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 트라야누스의 다키아 정복 (106)
  { predecessor: '다키아 왕국', successor: '로마 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 포사다 전투로 헝가리 종주권 이탈 (1330)
  { predecessor: '헝가리 왕국', successor: '왈라키아 공국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 보그단 1세의 자립 (1359)
  { predecessor: '헝가리 왕국', successor: '몰다비아 공국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 모하치 이후 3분할의 동부 — 슈파이어 조약으로 공국 재편 (1570)
  { predecessor: '헝가리 왕국', successor: '트란실바니아 공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 대타협으로 헝가리 재통합 (1867 — 역방향 쌍 4번째: 체코슬로바키아↔보호령 선례)
  { predecessor: '트란실바니아 공국', successor: '헝가리 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 부쿠레슈티 조약으로 베사라비아 할양 (1812)
  { predecessor: '몰다비아 공국', successor: '러시아 제국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 쿠자 이중 선출로 연합공국 성립 (1859 — 구성체 UNION: 세르비아 왕국(근대)→SHS 동형)
  { predecessor: '왈라키아 공국', successor: '몰다비아 왈라키아 연합공국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '몰다비아 공국', successor: '몰다비아 왈라키아 연합공국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 쿠자 퇴위·호엔촐레른 왕조 옹립·신헌법 (1866 — 동일 국가 내 왕조·체제 재편)
  { predecessor: '몰다비아 왈라키아 연합공국', successor: '루마니아 공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 왕국 승격 (1881 — 세르비아·불가리아·몬테네그로 공국→왕국 선례)
  { predecessor: '루마니아 공국', successor: '루마니아 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 트리아농으로 트란실바니아 등 할양 (1918/1920 — 기존국 영토 이전이라 SPLIT)
  { predecessor: '헝가리 왕국', successor: '루마니아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 소련 최후통첩(1940-06-26)·점령으로 베사라비아·북부코비나 상실 — MSSR 성립은 1940-08-02
  { predecessor: '루마니아 왕국', successor: '몰다비아 소비에트 사회주의 공화국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 군주제 폐지 (1947-12)
  { predecessor: '루마니아 왕국', successor: '루마니아 사회주의 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1989 혁명
  { predecessor: '루마니아 사회주의 공화국', successor: '루마니아 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 소련 해체기 몰도바 독립 (1991 — SFRY 해체 패턴 미러: 정체 연속 SUCCESSION + 연방 이탈 INDEPENDENCE)
  { predecessor: '몰다비아 소비에트 사회주의 공화국', successor: '몰도바 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '소비에트 사회주의 공화국 연방', successor: '몰도바 공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 오스만 조공 속국(자체 군주·제도 유지) — 오스만←불가리아 공국·두브로브니크 선례
  { parent: '오스만 제국', member: '왈라키아 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '오스만 제국', member: '몰다비아 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 트란실바니아는 1570~1699 구간만 오스만 종주권(이후 합스부르크)
  { parent: '오스만 제국', member: '트란실바니아 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 연합공국·루마니아 공국도 1877 독립 선언(1878 베를린 승인)까지 오스만 명목 종주권 하 조공국
  { parent: '오스만 제국', member: '몰다비아 왈라키아 연합공국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '오스만 제국', member: '루마니아 공국', role: HistoricalMembershipRole.VASSAL_STATE },
]

export async function seedRomaniaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 루마니아 역사 국가 계승·소속 관계 시딩 시작...')

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
