import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // ── 부르고뉴 → 합스부르크 (1482년 마리아의 결혼 상속) ──────────────
  {
    predecessor: '부르고뉴령 네덜란드',
    successor: '합스부르크령 네덜란드',
    eventType: TransitionEventType.SUCCESSION,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },

  // ── 1581년 독립 선언 → 남북 분열 (17주 → 공화국 / 스페인령) ────────
  {
    predecessor: '합스부르크령 네덜란드',
    successor: '네덜란드 공화국',
    eventType: TransitionEventType.SPLIT,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
  {
    predecessor: '합스부르크령 네덜란드',
    successor: '스페인령 네덜란드',
    eventType: TransitionEventType.SPLIT,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },

  // ── 1714년 라슈타트 조약: 스페인령 → 오스트리아령 ─────────────────
  {
    predecessor: '스페인령 네덜란드',
    successor: '오스트리아령 네덜란드',
    eventType: TransitionEventType.TREATY,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },

  // ── 1795년 프랑스 혁명군 점령: 공화국/오스트리아령 소멸 ───────────
  // 네덜란드 공화국 → 바타비아 공화국 (혁명 사상 이식 후 프랑스 자매공화국 수립)
  {
    predecessor: '네덜란드 공화국',
    successor: '바타비아 공화국',
    eventType: TransitionEventType.CONQUEST,
    transitionScope: TransitionScope.REGIME_CHANGE,
  },
  // 오스트리아령 네덜란드 → 네덜란드 연합왕국 (프랑스 병합기를 건너뛴 최종 계승)
  {
    predecessor: '오스트리아령 네덜란드',
    successor: '네덜란드 연합왕국',
    eventType: TransitionEventType.UNION,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },

  // ── 1806년 나폴레옹 괴뢰 왕국 수립 ────────────────────────────────
  {
    predecessor: '바타비아 공화국',
    successor: '홀란트 왕국',
    eventType: TransitionEventType.SUCCESSION,
    transitionScope: TransitionScope.REGIME_CHANGE,
  },

  // ── 1815년 빈 체제: 홀란트 왕국 → 네덜란드 연합왕국 ─────────────────
  // (1810~1813년 프랑스 직접 병합기는 생략; 오라녀 가문 복귀로 연합왕국 수립)
  {
    predecessor: '홀란트 왕국',
    successor: '네덜란드 연합왕국',
    eventType: TransitionEventType.SUCCESSION,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },

  // ── 1830~1839년 벨기에 혁명 → 분리 독립 ─────────────────────────────
  {
    predecessor: '네덜란드 연합왕국',
    successor: '벨기에 왕국',
    eventType: TransitionEventType.INDEPENDENCE,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
  {
    predecessor: '네덜란드 연합왕국',
    successor: '네덜란드 왕국',
    eventType: TransitionEventType.SUCCESSION,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // ── 신성로마제국 산하 봉건 영방 ────────────────────────────────────
  { parent: '신성로마제국', member: '플랑드르 백국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '신성로마제국', member: '홀란트 백국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '신성로마제국', member: '브라반트 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '신성로마제국', member: '리에주 주교후국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '신성로마제국', member: '룩셈부르크 공국', role: HistoricalMembershipRole.VASSAL_STATE },

  // ── 부르고뉴령 네덜란드의 구성 영방 (1384~1482) ────────────────────
  { parent: '부르고뉴령 네덜란드', member: '플랑드르 백국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '부르고뉴령 네덜란드', member: '홀란트 백국', role: HistoricalMembershipRole.UNION },
  { parent: '부르고뉴령 네덜란드', member: '브라반트 공국', role: HistoricalMembershipRole.UNION },
  { parent: '부르고뉴령 네덜란드', member: '룩셈부르크 공국', role: HistoricalMembershipRole.UNION },

  // ── 합스부르크령 네덜란드(17주)의 구성 영방 (1482~1581) ────────────
  { parent: '합스부르크령 네덜란드', member: '플랑드르 백국', role: HistoricalMembershipRole.UNION },
  { parent: '합스부르크령 네덜란드', member: '홀란트 백국', role: HistoricalMembershipRole.UNION },
  { parent: '합스부르크령 네덜란드', member: '브라반트 공국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '합스부르크령 네덜란드', member: '룩셈부르크 공국', role: HistoricalMembershipRole.UNION },

  // ── 스페인령 네덜란드 잔존 남부 영방 (1581~1714) ───────────────────
  { parent: '스페인령 네덜란드', member: '플랑드르 백국', role: HistoricalMembershipRole.UNION },
  { parent: '스페인령 네덜란드', member: '브라반트 공국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '스페인령 네덜란드', member: '룩셈부르크 공국', role: HistoricalMembershipRole.UNION },

  // ── 오스트리아령 네덜란드 남부 영방 (1714~1795) ────────────────────
  { parent: '오스트리아령 네덜란드', member: '플랑드르 백국', role: HistoricalMembershipRole.UNION },
  { parent: '오스트리아령 네덜란드', member: '브라반트 공국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '오스트리아령 네덜란드', member: '룩셈부르크 공국', role: HistoricalMembershipRole.UNION },

  // ── 네덜란드 공화국: 홀란트가 주도 지방 (연방 구성주는 다수이나 본 데이터에서는 홀란트만 기재) ──
  { parent: '네덜란드 공화국', member: '홀란트 백국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
]

export async function seedBeneluxHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 베네룩스 역사 국가 계승·소속 관계 시딩 시작...')

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
