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
  // ── 키예프 루스 분열 (13세기 몽골 침공 후) ──────────────────────────
  { predecessor: '키예프 루스', successor: '노브고로드 공화국',                  eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '키예프 루스', successor: '블라디미르-수즈달 공국',              eventType: TransitionEventType.SPLIT,       transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '키예프 루스', successor: '트베리 대공국',                      eventType: TransitionEventType.SPLIT,       transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '키예프 루스', successor: '랴잔 공국',                          eventType: TransitionEventType.SPLIT,       transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '키예프 루스', successor: '모스크바 대공국',                    eventType: TransitionEventType.SPLIT,       transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 모스크바 대공국의 루스 통일 ──────────────────────────────────────
  { predecessor: '블라디미르-수즈달 공국', successor: '모스크바 대공국',          eventType: TransitionEventType.UNION,       transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '노브고로드 공화국',      successor: '모스크바 대공국',          eventType: TransitionEventType.CONQUEST,    transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '트베리 대공국',          successor: '모스크바 대공국',          eventType: TransitionEventType.CONQUEST,    transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '랴잔 공국',              successor: '모스크바 대공국',          eventType: TransitionEventType.CONQUEST,    transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 모스크바 → 차르국 → 제국 ────────────────────────────────────────
  // 이반 4세가 1547년 차르 칭호 선포 (STATE_SUCCESSION: 새 국체 선언)
  { predecessor: '모스크바 대공국', successor: '러시아 차르국',                  eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.STATE_SUCCESSION },
  // 표트르 대제가 1721년 황제 칭호 선포 (REGIME_CHANGE: 동일 영토·지배층의 체제 전환)
  { predecessor: '러시아 차르국',   successor: '러시아 제국',                    eventType: TransitionEventType.SUCCESSION,  transitionScope: TransitionScope.REGIME_CHANGE },

  // ── 러시아 제국 붕괴 → 혁명기 ────────────────────────────────────────
  // 1917년 2월 혁명: 제정 해체, 임시정부 수립
  { predecessor: '러시아 제국',     successor: '러시아 공화국',                  eventType: TransitionEventType.DISSOLVED,   transitionScope: TransitionScope.REGIME_CHANGE },
  // 1917년 10월 혁명: 볼셰비키 쿠데타
  { predecessor: '러시아 공화국',   successor: '러시아 소비에트 연방 사회주의 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },

  // ── 소비에트 연방 창설 (1922) ────────────────────────────────────────
  // 창설 조약 서명 4개 주체 (러시아·우크라이나·벨로루시·자카프카스 SFSR)
  { predecessor: '러시아 소비에트 연방 사회주의 공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '우크라이나 소비에트 사회주의 공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '벨로루시 소비에트 사회주의 공화국',  successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 코카서스 3국은 1922년 자카프카스 SFSR로 묶여 창설 합류, 1936년 개별 공화국으로 분리
  { predecessor: '조지아 소비에트 사회주의 공화국',     successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아르메니아 소비에트 사회주의 공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아제르바이잔 소비에트 사회주의 공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1924~1936년 순차 합류
  { predecessor: '우즈베크 소비에트 사회주의 공화국',   successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '투르크멘 소비에트 사회주의 공화국',   successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '타지크 소비에트 사회주의 공화국',     successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '카자흐 소비에트 사회주의 공화국',     successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '키르기스 소비에트 사회주의 공화국',   successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 발트 3국·몰다비아 1940년 강제 병합
  { predecessor: '에스토니아 소비에트 사회주의 공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '라트비아 소비에트 사회주의 공화국',   successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '리투아니아 소비에트 사회주의 공화국', successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '몰다비아 소비에트 사회주의 공화국',   successor: '소비에트 사회주의 공화국 연방', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 키예프 루스 → 분열 공국 소속 (루스 권역)
  { parent: '키예프 루스', member: '노브고로드 공화국',       role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '키예프 루스', member: '블라디미르-수즈달 공국',  role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '키예프 루스', member: '트베리 대공국',           role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '키예프 루스', member: '랴잔 공국',               role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '키예프 루스', member: '모스크바 대공국',         role: HistoricalMembershipRole.VASSAL_STATE },

  // 소비에트 연방 구성 공화국 (15개)
  { parent: '소비에트 사회주의 공화국 연방', member: '러시아 소비에트 연방 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, isLeadingMember: true },
  { parent: '소비에트 사회주의 공화국 연방', member: '우크라이나 소비에트 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '벨로루시 소비에트 사회주의 공화국',  role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '조지아 소비에트 사회주의 공화국',     role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '아르메니아 소비에트 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '아제르바이잔 소비에트 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '카자흐 소비에트 사회주의 공화국',     role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '우즈베크 소비에트 사회주의 공화국',   role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '투르크멘 소비에트 사회주의 공화국',   role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '타지크 소비에트 사회주의 공화국',     role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '키르기스 소비에트 사회주의 공화국',   role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '에스토니아 소비에트 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '라트비아 소비에트 사회주의 공화국',   role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '리투아니아 소비에트 사회주의 공화국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  { parent: '소비에트 사회주의 공화국 연방', member: '몰다비아 소비에트 사회주의 공화국',   role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
]

export async function seedRussiaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 러시아 역사 국가 계승·소속 관계 시딩 시작...')

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

  console.log(`\n✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건 완료\n`)
}
