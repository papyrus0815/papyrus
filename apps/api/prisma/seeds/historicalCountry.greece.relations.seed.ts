import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// 로마 공화국·로마 제국은 italy 시드, 동로마 제국·오스만 제국은 사건 시드(콘스탄티노플 함락) 유래,
// 베네치아 공화국은 italy 시드, 연합왕국은 britain 시드 소유 노드 — 이름 기반 조회라
// 파이프라인 첫 실행 순서상 없으면 warn+skip되고 재실행에서 채워진다.
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // ── 고대 ────────────────────────────────────────────────────────────
  // 청동기 붕괴로 궁전 체계 소멸(BC 1200경) → 암흑기를 거쳐 폴리스 세계로.
  // 아티카는 도리스 이주의 파괴를 비켜가 미케네기 정착이 이어졌다는 것이 아테네의 자생(아우토크톤) 전승이라
  // 계승 엣지는 아테네 한 갈래로만 둔다(약 300년 갭 단순화 — 카란타니아→케른텐 선례)
  { predecessor: '미케네 문명', successor: '아테네', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 나비스 사후 필로포이멘이 스파르타를 동맹에 강제 편입 (BC 192)
  { predecessor: '스파르타', successor: '아카이아 동맹', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 피드나 패전으로 왕정 폐지(BC 168) → BC 146 마케도니아 속주
  { predecessor: '마케도니아 왕국', successor: '로마 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 아카이아 전쟁·코린토스 파괴로 동맹 해체와 그리스 병합 (BC 146)
  { predecessor: '아카이아 동맹', successor: '로마 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아테네', successor: '로마 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 1204년 분할 ─────────────────────────────────────────────────────
  // 제4차 십자군의 콘스탄티노플 함락 (1204)
  { predecessor: '동로마 제국', successor: '라틴 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 그리스인 계승국의 성립 — 제국 자체가 갈라진 사례라 SPLIT(로마 제국→서로마 제국 선례).
  // INDEPENDENCE는 '모국→이탈 신생국' 전용이라 해당 없음
  { predecessor: '동로마 제국', successor: '에페이로스 전제군주국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 십자군 봉신국의 영토 탈취 (1205)
  { predecessor: '동로마 제국', successor: '아테네 공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '동로마 제국', successor: '아카이아 공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 미하일 8세의 콘스탄티노플 수복 (1261) — 역방향 계승쌍(잉글랜드 왕국↔연방 선례)
  { predecessor: '라틴 제국', successor: '동로마 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 켄투리오네 2세 사후 모레아 전제공국이 잔여 영토 흡수 (1432)
  { predecessor: '아카이아 공국', successor: '모레아 전제공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 오스만 정복 ─────────────────────────────────────────────────────
  // 콘스탄티노플 함락 (1453) — 사건 시드가 노드만 만들고 엣지는 없어 이 배치에서 개통
  { predecessor: '동로마 제국', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아테네 공국', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 메흐메트 2세의 모레아 원정 (1460) — 동로마 최후의 영토
  { predecessor: '모레아 전제공국', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 보니차 함락 (1479)
  { predecessor: '에페이로스 전제군주국', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 근대 ────────────────────────────────────────────────────────────
  // 1797년 베네치아 소멸 후 프랑스령·셉틴술라 공화국을 거쳐 1815년 파리 조약으로 영국 보호령 성립
  // (중간기 단순화 — 카란타니아→케른텐 선례)
  { predecessor: '베네치아 공화국', successor: '이오니아 제도 합중국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 독립 전쟁·에피다브로스 독립 선언 (1822)
  { predecessor: '오스만 제국', successor: '그리스 제1공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 런던 회의로 왕국 창설 (1832-05)
  { predecessor: '그리스 제1공화국', successor: '그리스 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 런던 조약으로 이오니아 제도 할양 (1864)
  { predecessor: '이오니아 제도 합중국', successor: '그리스 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 열강 개입으로 오스만 종주권 하 자치국 성립 (1898) — 동루멜리아 TREATY 선례
  { predecessor: '오스만 제국', successor: '크레타국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 에노시스 확정 (1913 부쿠레슈티·런던 조약) — 존속국에 흡수되는 구성체라 UNION
  { predecessor: '크레타국', successor: '그리스 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 왕정 폐지와 복고 (1924-03 / 1935-11) — 역방향 계승쌍
  { predecessor: '그리스 왕국', successor: '그리스 제2공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '그리스 제2공화국', successor: '그리스 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 추축국 점령과 해방 (1941-04 / 1944-10) — 비시 프랑스형 부역 정권 왕복
  { predecessor: '그리스 왕국', successor: '그리스국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '그리스국', successor: '그리스 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 대령들의 쿠데타 (1967-04) — 1973-06 왕정 폐지까지 왕국과 병존
  { predecessor: '그리스 왕국', successor: '그리스 군사정권', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 메타폴리테프시 (1974-07)
  { predecessor: '그리스 군사정권', successor: '그리스 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 코린토스 동맹(BC 337) 이후 마케도니아 패권 아래 놓였고 BC 322 라미아 전쟁 패배로 수비대가 주둔했다.
  // 명목 종주권만으로도 VASSAL_STATE 성립(오스만←불가리아 공국 선례)
  { parent: '마케도니아 왕국', member: '아테네', role: HistoricalMembershipRole.VASSAL_STATE },
  // BC 192 강제 편입 — 연방 의회에 표를 가진 구성 도시가 되었다
  { parent: '아카이아 동맹', member: '스파르타', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 로마니아 분할 협정에 따른 십자군 봉신국(자체 군주 보유)
  { parent: '라틴 제국', member: '아테네 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '라틴 제국', member: '아카이아 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 황족이 전제공으로 부임한 동로마의 분국 — 자체 군주를 둔 속령이라 DOMINION이 아닌 VASSAL_STATE
  { parent: '동로마 제국', member: '모레아 전제공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 술탄의 명목 종주권 아래 열강이 고등판무관을 세운 자치국 — 자체 군주가 없어 동루멜리아형 DOMINION
  { parent: '오스만 제국', member: '크레타국', role: HistoricalMembershipRole.DOMINION },
  // 1815 파리 조약에 따른 영국 보호령(고등판무관이 실권)
  { parent: '그레이트브리튼 및 아일랜드 연합왕국', member: '이오니아 제도 합중국', role: HistoricalMembershipRole.PROTECTORATE },
]

export async function seedGreeceHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 그리스 역사 국가 계승·소속 관계 시딩 시작...')

  // 이름 → id 맵 구축
  const nameToId = new Map<string, string>()
  const allNames = new Set([
    ...TRANSITIONS.map((transition) => transition.predecessor),
    ...TRANSITIONS.map((transition) => transition.successor),
    ...MEMBERSHIPS.map((membership) => membership.parent),
    ...MEMBERSHIPS.map((membership) => membership.member),
  ])
  for (const name of allNames) {
    const found = await prisma.historicalCountry.findFirst({ where: { name } })
    if (found) nameToId.set(name, found.id)
    else console.warn(`  ⚠️  찾을 수 없음: ${name}`)
  }

  // ── 계승 관계 ──────────────────────────────────────────────────────
  console.log('\n  📜 계승 관계 등록...')
  let transitionCount = 0
  for (const transition of TRANSITIONS) {
    const predecessorId = nameToId.get(transition.predecessor)
    const successorId = nameToId.get(transition.successor)
    if (!predecessorId || !successorId) continue

    const exists = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId, successorId },
    })
    if (!exists) {
      await prisma.historicalCountryTransition.create({
        data: {
          predecessorId,
          successorId,
          eventType: transition.eventType,
          transitionScope: transition.transitionScope,
        },
      })
      console.log(`    ✅ ${transition.predecessor} → ${transition.successor} (${transition.eventType})`)
      transitionCount++
    } else {
      console.log(`    ♻️  ${transition.predecessor} → ${transition.successor}`)
    }
  }

  // ── 소속 관계 ──────────────────────────────────────────────────────
  console.log('\n  🏛️  소속 관계 등록...')
  let membershipCount = 0
  for (const membership of MEMBERSHIPS) {
    const parentId = nameToId.get(membership.parent)
    const memberId = nameToId.get(membership.member)
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
          role: membership.role,
          isLeadingMember: membership.isLeadingMember ?? false,
        },
      })
      console.log(`    ✅ [${membership.parent}] ← ${membership.member}${membership.isLeadingMember ? ' (주축)' : ''}`)
      membershipCount++
    } else {
      console.log(`    ♻️  [${membership.parent}] ← ${membership.member}`)
    }
  }

  console.log(`\n✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건 완료\n`)
}
