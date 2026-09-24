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
  // ── 고대 흑해 북안 ──────────────────────────────────────────────
  // 기원전 110년대 디오판토스 원정으로 크림의 스키타이가 굴복하고 보스포로스가 초원을 장악
  { predecessor: '스키타이', successor: '보스포로스 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 4세기 훈족의 물결로 왕국이 무너지고 6세기 유스티니아누스가 크림 잔여 영역을 거둬들임
  { predecessor: '보스포로스 왕국', successor: '동로마 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 668년 하자르가 대불가리아를 깨뜨리고 초원의 패권을 이어받음 (불가르는 서쪽·북쪽으로 이산)
  { predecessor: '고대 대불가리아', successor: '하자르 칸국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 965년 스뱌토슬라프 1세의 사르켈·아틸 파괴
  { predecessor: '하자르 칸국', successor: '키예프 루스', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 루스 분열 (1132) — 기존 SPLIT 부채꼴에 우크라이나 쪽 두 갈래를 더한다 ──
  { predecessor: '키예프 루스', successor: '키예프 공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '키예프 루스', successor: '페레야슬라우 공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 몽골 침입 (1240) ────────────────────────────────────────────
  { predecessor: '키예프 루스', successor: '금장 칸국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '페레야슬라우 공국', successor: '금장 칸국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 리투아니아·폴란드의 진출 (14세기) ───────────────────────────
  // 1349년 카지미에시 3세의 할리치 병합 / 볼히니아는 리투아니아 몫
  { predecessor: '갈리치아-볼히니아 공국', successor: '폴란드 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '갈리치아-볼히니아 공국', successor: '리투아니아 대공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1362년 시니 보디(청수) 전투 — 키이우·체르니히우가 리투아니아 종주권 아래로
  { predecessor: '키예프 공국', successor: '리투아니아 대공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '체르니고프 공국', successor: '리투아니아 대공국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 초원의 분열과 러시아의 남하 ─────────────────────────────────
  // 1441년 하즈 1세 기라이가 갈라져 나옴 — 금장 칸국은 대오르다로 1502년까지 잔존
  { predecessor: '금장 칸국', successor: '크림 칸국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1783년 예카테리나 2세의 병합
  { predecessor: '크림 칸국', successor: '러시아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 카자크 ──────────────────────────────────────────────────────
  // 1648 흐멜니츠키 봉기 — 시치의 자포리자 군단이 그대로 국가의 골격이 되었다
  { predecessor: '자포리자 카자크 시치', successor: '카자크 수장국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 연방에서 떨어져 나온 신생국 방향이라 INDEPENDENCE
  { predecessor: '폴란드-리투아니아 연방', successor: '카자크 수장국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1764년 헤트만직 폐지 → 소러시아 참사회 / 1775년 시치 파괴
  { predecessor: '카자크 수장국', successor: '러시아 제국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '자포리자 카자크 시치', successor: '러시아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 합스부르크 치하 서부 ────────────────────────────────────────
  // 1772년 제1차 폴란드 분할
  { predecessor: '폴란드-리투아니아 연방', successor: '갈리치아-로도메리아 왕국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1774~75년 오스만이 몰다비아 북부를 합스부르크에 할양
  { predecessor: '몰다비아 공국', successor: '부코비나 공국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1918년 제국 해체 — 동갈리치아는 ZUNR 선포, 서갈리치아는 폴란드로
  { predecessor: '갈리치아-로도메리아 왕국', successor: '서우크라이나 인민공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '갈리치아-로도메리아 왕국', successor: '폴란드 제2공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1918-11 부코비나는 루마니아 왕국에 병합
  { predecessor: '부코비나 공국', successor: '루마니아 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 1917~1921 독립 시도 ─────────────────────────────────────────
  // 1917-11 제3차 우니베르살 / 1918-01 제4차 우니베르살(완전 독립)
  { predecessor: '러시아 공화국', successor: '우크라이나 인민공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1918-04-29 스코로파츠키 쿠데타 ↔ 1918-12 디렉토리야 복귀: 같은 나라의 체제 교체 왕복 쌍
  { predecessor: '우크라이나 인민공화국', successor: '우크라이나국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '우크라이나국', successor: '우크라이나 인민공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1919-01-22 통일 법령(즐루카) — 서부가 UNR의 서부주로 합류
  { predecessor: '서우크라이나 인민공화국', successor: '우크라이나 인민공화국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1919-07 폴란드군이 즈브루치강 너머로 밀어냄 → 1923년 동갈리치아 폴란드 귀속 승인
  { predecessor: '서우크라이나 인민공화국', successor: '폴란드 제2공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1919~21 볼셰비키의 제압
  { predecessor: '우크라이나 인민공화국', successor: '우크라이나 소비에트 사회주의 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 자카르파탸 ──────────────────────────────────────────────────
  // 1939-03-15 독일의 체코슬로바키아 해체 틈에 독립 선포
  { predecessor: '체코슬로바키아', successor: '카르파토우크라이나', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 같은 날 진격한 헝가리군에 사흘 만에 점령
  { predecessor: '카르파토우크라이나', successor: '헝가리 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 독일 점령과 수복 ────────────────────────────────────────────
  { predecessor: '우크라이나 소비에트 사회주의 공화국', successor: '우크라이나 제국판무관부', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '우크라이나 제국판무관부', successor: '우크라이나 소비에트 사회주의 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 1991 독립 ───────────────────────────────────────────────────
  // 소련의 SSR 독립 유출 엣지(몰도바 공화국 전례) + 최고 라다가 그대로 이어진 국가 연속성
  { predecessor: '소비에트 사회주의 공화국 연방', successor: '우크라이나 공화국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '우크라이나 소비에트 사회주의 공화국', successor: '우크라이나 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// { parent, member, role, isLeadingMember, startDate, endDate }
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
  startDate?: string
  endDate?: string
}[] = [
  // 1240년 파괴 뒤 키이우는 칸이 임명하는 총독이 다스린 속령이었다
  { parent: '금장 칸국', member: '키예프 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1362년 시니 보디 뒤 올겔도비치 가문이 대공의 봉신으로 다스림 ~ 1471년 공국 폐지
  { parent: '리투아니아 대공국', member: '키예프 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1478년 멩글리 1세 기라이가 술탄의 종주권을 받아들임 ~ 1774년 퀴췩카이나르자 조약.
  // 자체 칸과 조정을 유지한 자치국이라 명목 종주권만으로도 VASSAL_STATE(불가리아 공국 전례)
  { parent: '오스만 제국', member: '크림 칸국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 시치는 연방의 명목상 신민이었으나 자체 라다와 원정권을 유지했다
  { parent: '폴란드-리투아니아 연방', member: '자포리자 카자크 시치', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1654 페레야슬라프 조약으로 차르의 보호 아래로 — 차르국·제국 두 시기로 나눠 단다
  { parent: '러시아 차르국', member: '카자크 수장국', role: HistoricalMembershipRole.PROTECTORATE },
  { parent: '러시아 제국', member: '카자크 수장국', role: HistoricalMembershipRole.PROTECTORATE },
  // 합스부르크 왕관령 — 자체 군주 없이 황제가 왕호를 겸한 속령이라 DOMINION(스웨덴 발트 속령 전례)
  { parent: '오스트리아 제국', member: '갈리치아-로도메리아 왕국', role: HistoricalMembershipRole.DOMINION },
  { parent: '오스트리아-헝가리 제국', member: '갈리치아-로도메리아 왕국', role: HistoricalMembershipRole.DOMINION },
  { parent: '오스트리아 제국', member: '부코비나 공국', role: HistoricalMembershipRole.DOMINION },
  { parent: '오스트리아-헝가리 제국', member: '부코비나 공국', role: HistoricalMembershipRole.DOMINION },
  // 1919-01-22 즐루카 이후 ZUNR은 UNR의 '서부주(ZOUNR)'로 편입되었으나 군·행정은 따로 움직였다
  { parent: '우크라이나 인민공화국', member: '서우크라이나 인민공화국', role: HistoricalMembershipRole.UNION, startDate: '1919-01-22' },
  // 1938-10 뮌헨 협정 뒤 체코슬로바키아가 연방으로 재편되며 얻은 자치
  { parent: '체코슬로바키아', member: '카르파토우크라이나', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 제국판무관부는 독일이 직접 세운 민정 통치구 (알바니아 독일 점령기 판례와 같은 자리)
  { parent: '나치 독일 (제3제국)', member: '우크라이나 제국판무관부', role: HistoricalMembershipRole.PROTECTORATE },
]

export async function seedUkraineHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 우크라이나 역사 국가 계승·소속 관계 시딩 시작...')

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
          membershipStartDate: membership.startDate ? new Date(`${membership.startDate}T00:00:00Z`) : undefined,
          membershipEndDate: membership.endDate ? new Date(`${membership.endDate}T00:00:00Z`) : undefined,
          isLeadingMember: membership.isLeadingMember ?? false,
        },
      })
      console.log(`    ✅ [${membership.parent}] ← ${membership.member}`)
      membershipCount++
    } else {
      console.log(`    ♻️  [${membership.parent}] ← ${membership.member}`)
    }
  }

  console.log(`\n✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건 완료\n`)
}
