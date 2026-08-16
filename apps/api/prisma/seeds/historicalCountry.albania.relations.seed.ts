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
  // BC168 제3차 일리리아 전쟁에서 아니키우스 갈루스가 30일 만에 스코드라를 함락하고 겐티우스를
  // 포로로 잡아 왕국 소멸 — 정복 소멸은 피정복→정복자 방향
  { predecessor: '일리리아 왕국', successor: '로마 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // BC231 아이아키다이 단절로 왕정 폐지·코이논 성립. 자기 전신의 체제전환이라 INDEPENDENCE가
  // 아닌 SUCCESSION + REGIME_CHANGE, 전임 end == 후임 start 공유 경계
  { predecessor: '에페이로스 왕국', successor: '에페이로스 동맹', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // BC167 아이밀리우스 파울루스가 몰로시아 70개 취락을 파괴하며 연맹이 실체를 잃었고,
  // 로마 직접 통제를 거쳐 BC146 마케도니아 속주에 편입
  { predecessor: '에페이로스 동맹', successor: '로마 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1190년경 프로곤이 동로마의 지배 이완을 틈타 크루여 일대에서 자립, 1204년 완전 독립 —
  // '동로마 제국 → 두클랴' INDEPENDENCE 판례와 동형
  { predecessor: '동로마 제국', successor: '아르바논 공국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1255년경 니케아가 병합하고 동로마식 행정을 이식. 코퍼스에 니케아 제국 행이 없어 동로마 제국에 귀속
  { predecessor: '아르바논 공국', successor: '동로마 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 주 전신 엣지 — 1271년 미하일 8세령 두러스를 앙주가 탈취하고 1272-02-21 레그눔 알바니아이 선포
  { predecessor: '동로마 제국', successor: '알바니아 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 보조 전신 엣지 — 1259년 미하일 2세가 만프레디에게 지참금으로 양여한 두러스·발로나·베라트
  // 해안대의 원소유자. 앙주가 실제로 밀어낸 상대는 동로마이므로 주 전신은 위 엣지
  { predecessor: '에페이로스 전제군주국', successor: '알바니아 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1368년 카를 토피아가 앙주로부터 두러스를 빼앗아 왕국이 실질적으로 끝남(선재 행 end=1368과 일치).
  // 1376~1383 재점령은 일시적 복구
  { predecessor: '알바니아 왕국', successor: '알바니아 공국 (중세)', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1392-10 게르지 토피아가 두러스를 베네치아에 양도 — 영토 일부의 협약 이전이라 CONQUEST가 아닌
  // TREATY(베네치아 공화국→달마티아 왕국 판례)
  { predecessor: '알바니아 공국 (중세)', successor: '베네치아령 알바니아', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1415년 오스만이 크루여를 점령하고 토피아 잔여 영역을 알바니아 산자크로 편입하며 공국 소멸
  { predecessor: '알바니아 공국 (중세)', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1443-11 니시 전투에서 스컨데르베우가 이탈해 크루여를 회복하고 1444-03-02 레저 회맹으로 동맹
  // 성립 — 모국에서 이탈한 신생 정치체 방향
  { predecessor: '오스만 제국', successor: '레저 동맹', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1444년 카스트리오티 공국이 동맹의 중핵으로 흡수되며 통치 실체가 동맹으로 이관
  { predecessor: '카스트리오티 공국', successor: '레저 동맹', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1478-06 크루여 함락으로 소멸(레저도 직후 상실). 1479-01-25 콘스탄티노폴리스 조약의 슈코더르
  // 인도는 베네치아령이라 '베네치아령 알바니아' 행 몫 — 이중 계상 회피
  { predecessor: '레저 동맹', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1797 캄포포르미오 조약으로 합스부르크 이관 후 1810년 코토르 만이 일리리아 주에 편입.
  // 1797~1809 과도기는 갭 단순화이며 eventType은 베네치아 1797 후속 엣지의 코퍼스 표준 TREATY
  { predecessor: '베네치아령 알바니아', successor: '일리리아 주', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1912-11-28 블로러 만민회의의 독립 선언으로 오스만 지배에서 이탈 —
  // 오스만 제국→불가리아 공국·그리스 제1공화국 판례와 동형
  { predecessor: '오스만 제국', successor: '알바니아 임시 정부', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 자기 전신의 국체 전환. 경계 월 1914-02는 신체제 성립 행위(2/21 비트의 빌헬름 추대 수락)의 달
  { predecessor: '알바니아 임시 정부', successor: '알바니아 공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1925-01-21 제헌의회의 공화국 선포, 1/31 조구 대통령 선출·2/1 취임. 군주정→공화정 교체
  { predecessor: '알바니아 공국', successor: '알바니아 제1공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1928-09-01 제헌의회가 공화정을 폐지하고 왕정 선포 — 동일 인물·동일 지배집단의 국체 변경
  { predecessor: '알바니아 제1공화국', successor: '알바니아 왕국 (근대)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1939-04-07 침공·조구 망명, 04-12 왕관 봉정. successor가 정복자(파시스트 이탈리아)가 아니라
  // 같은 알바니아 국가의 후임 체제이므로 CONQUEST가 아닌 SUCCESSION(그리스 왕국→그리스국 판례)
  { predecessor: '알바니아 왕국 (근대)', successor: '알바니아 왕국 (이탈리아 보호령)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1943-09-08 이탈리아 휴전 직후 독일군 진주, 왕위 공석·섭정위원회 체제로 전환.
  // 후견국·통치기구만 교체된 부역정권 간 이행
  { predecessor: '알바니아 왕국 (이탈리아 보호령)', successor: '알바니아 왕국 (독일 점령기)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1944-11-29 독일군 철수, 1946-01-11 제헌의회가 군주제를 폐지하고 인민공화국 선포.
  // 그 사이 14개월의 알바니아 민주정부는 별도 행 없이 갭으로 단순화(유고 DFY 미분할 판례)
  { predecessor: '알바니아 왕국 (독일 점령기)', successor: '알바니아 사회주의 인민공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1991-04-29 인민의회가 '주요 헌법 규정' 법률을 채택해 1976년 헌법을 대체하고 국호에서
  // '사회주의 인민'을 삭제. 정권교체 완결은 1992-03-22 총선
  { predecessor: '알바니아 사회주의 인민공화국', successor: '알바니아 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// 날짜 필드는 코퍼스 관행(26/27행 NULL)에 따라 비워 두되, 아래 시칠리아·나폴리 UNION 두 건만
// 예외로 채운다 — 같은 member(알바니아 왕국)에 대해 상호배타 구간이라 날짜가 없으면
// "두 왕국과 동시에 동군연합"으로 오독된다. 사료로 확정된 날짜만 쓰고 추정 날짜는 넣지 않는다.
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  startDate?: string
  endDate?: string
  isLeadingMember?: boolean
}[] = [
  // BC228~BC168. 제1차 일리리아 전쟁 강화로 배상금·조공과 리소스 이남 항행 제한을 받아들였으나
  // 자체 왕권·주화·외교를 유지했고 로마 상주 기관이 없어 PROTECTORATE가 아닌 VASSAL_STATE.
  // (BC 날짜는 DATETIME으로 표현할 수 없어 기간은 이 주석에만 남긴다)
  { parent: '로마 공화국', member: '일리리아 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  // BC169~168 겐티우스와 페르세우스의 반로마 동맹. 종속이 아닌 대등한 군사 제휴이며
  // 이 동맹이 왕국 소멸의 직접 원인
  { parent: '마케도니아 왕국', member: '일리리아 왕국', role: HistoricalMembershipRole.ALLY },
  // 제1차 마케도니아 전쟁기 필리포스 5세 진영 참여(BC205 포이니케 조약 중재)와
  // BC170 케팔로스 주도의 페르세우스 측 이반. 연맹 전체가 종속된 적은 없다
  { parent: '마케도니아 왕국', member: '에페이로스 동맹', role: HistoricalMembershipRole.ALLY },
  // 1216~1230경. 데메트리우스 프로고니 사후 그레고리 카모나스가 미하일 1세·테오도로스 콤니노스
  // 두카스의 종주권 아래 통치
  { parent: '에페이로스 전제군주국', member: '아르바논 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1230~1241. 클로코트니차 전투 후 이반 아센 2세의 종주권 아래 들어갔고 골렘이 혼인으로 결속
  { parent: '불가리아 제2제국', member: '아르바논 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1241~1256. 니케아를 세 번째 종주로 명시한 사료에 따른 것으로, 니케아를 동로마 제국 행에
  // 매핑하는 처리는 '아르바논 공국→동로마 제국' 계승 엣지와 같은 규약
  { parent: '동로마 제국', member: '아르바논 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 앙주의 샤를 1세가 시칠리아 왕관과 알바니아 왕관을 함께 쓴 동군연합.
  // 종료는 시칠리아 만종(1282-03-30)
  { parent: '시칠리아 왕국', member: '알바니아 왕국', role: HistoricalMembershipRole.UNION, startDate: '1272-02-21', endDate: '1282-03-30' },
  // 시칠리아 만종 이후 알바니아 왕관은 카를로 2세·타란토의 필리포·두러스의 조반나 등 나폴리
  // 군주계가 계승. 종료일은 사료로 특정되지 않아(1368년 두러스 상실) NULL로 두고 행 end에 맡긴다
  { parent: '나폴리 왕국', member: '알바니아 왕국', role: HistoricalMembershipRole.UNION, startDate: '1282-03-30' },
  // 1392~1415(니케타 토피아의 크루여 영주기, 중간 공백 있음). 두러스 양도 후 자체 군주를 존치한 채
  // 베네치아 종주권을 인정
  { parent: '베네치아 공화국', member: '알바니아 공국 (중세)', role: HistoricalMembershipRole.VASSAL_STATE },
  // 본국이 파견한 총독(프로베디토레)이 직접 통치한 스타토 다 마르 해외령.
  // 코퍼스의 DOMINION 판례(동루멜리아·크레타국)는 '자체 군주 없는 자치체'라 부적합해 COLONY 첫 적용
  { parent: '베네치아 공화국', member: '베네치아령 알바니아', role: HistoricalMembershipRole.COLONY },
  // 1417~1443. 죤 카스트리오티가 아들들을 인질로 보내고 봉신이 되었으며 1443년 니시 이탈로 종료
  { parent: '오스만 제국', member: '카스트리오티 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1444년 레저 회맹에 발샤 계열 인사와 스테판 츠르노예비치가 참여(츠르노예비치의 제타 통치는
  // 1451년부터라 참여 시점과 통치 시점에 시차가 있다). 레저 동맹에 ME 링크를 붙이는 대신
  // 이 소속 관계로 몬테네그로 축을 표현
  { parent: '레저 동맹', member: '제타 공국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 1451-03-26 가에타 조약으로 스컨데르베우가 알폰소(나폴리 1세)의 봉신을 자처하고 지원을 받음.
  // 실효 지배 없는 명목 종주권에도 VASSAL_STATE를 부여한 오스만←몬테네그로 주교후국 판례와 동형
  { parent: '나폴리 왕국', member: '레저 동맹', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1917-06 지로카스터르 선언으로 이탈리아 보호 아래의 알바니아 독립을 일방 선포했고 영·프는 미승인.
  // 1920년 블로러 전쟁과 티라나 의정서로 종료
  { parent: '이탈리아 왕국', member: '알바니아 공국', role: HistoricalMembershipRole.PROTECTORATE },
  // 1926-11·1927-11 제1차·제2차 티라나 조약. 형식상 대등한 우호·방위 조약이라 ALLY이며
  // 실질은 군·재정 통제
  { parent: '파시스트 이탈리아', member: '알바니아 제1공화국', role: HistoricalMembershipRole.ALLY },
  // 티라나 조약 체제 승계와 SVEA 차관·군사고문 종속. 자체 군주·형식적 주권을 보유했으므로
  // PROTECTORATE가 아닌 ALLY
  { parent: '파시스트 이탈리아', member: '알바니아 왕국 (근대)', role: HistoricalMembershipRole.ALLY },
  // 1939-04-12~1943-09-08. 형식은 동군연합이나 실제로는 이탈리아 총독(자코모니→파리아치)이
  // 통치하고 외교·군사·재정이 로마에 귀속. 통화는 이탈리아 리라, 알바니아 파시스트당이 유일 정당
  { parent: '파시스트 이탈리아', member: '알바니아 왕국 (이탈리아 보호령)', role: HistoricalMembershipRole.PROTECTORATE },
  // 1943-09-08~1944-11-29. '독립·중립국' 승인이라는 법적 허구를 유지했으나 군정·경찰·
  // SS 스칸데르베그 사단 편성을 독일이 직접 통제(크로아티아 독립국·보헤미아-모라바 보호령 판례)
  { parent: '나치 독일 (제3제국)', member: '알바니아 왕국 (독일 점령기)', role: HistoricalMembershipRole.PROTECTORATE },
]

export async function seedAlbaniaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 알바니아 역사 국가 계승·소속 관계 시딩 시작...')

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
