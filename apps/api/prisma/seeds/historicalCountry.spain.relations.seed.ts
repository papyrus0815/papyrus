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
  // ── 게르만 이동기 ───────────────────────────────────────────────
  // 409년 라인 도하 무리의 이베리아 진입, 411년 갈라이키아 분배(호스피탈리타스)
  { predecessor: '서로마 제국', successor: '수에비 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 418년 발리아와 맺은 포에두스로 아키타니아 제2주에 정착 — 조약에 의한 영역 이양이라 TREATY
  { predecessor: '서로마 제국', successor: '서고트 왕국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 585년 레오비길도가 브라가를 함락하고 수에비 왕국을 병합
  { predecessor: '수에비 왕국', successor: '서고트 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 711년 정복과 알안달루스 ─────────────────────────────────────
  // 711~756년의 총독기(우마이야 칼리파국의 속주)는 별도 행을 두지 않고 한 엣지로 잇는다
  // (로마 속주를 별행으로 두지 않은 알바니아 판례)
  { predecessor: '서고트 왕국', successor: '코르도바 토후국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 718년 코바동가 — 서고트 계승을 표방한 잔존 세력의 재건이라 SUCCESSION
  // (모국이 살아 있는 이탈이 아니므로 INDEPENDENCE가 아니다 — 러시아 판례)
  { predecessor: '서고트 왕국', successor: '아스투리아스 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 929-01 압드 알라흐만 3세의 칼리프 선포 — 같은 나라의 격상이라 REGIME_CHANGE
  { predecessor: '코르도바 토후국', successor: '코르도바 칼리파국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },

  // ── 1031년 피트나와 타이파 분열 ─────────────────────────────────
  // 수십 개 타이파 가운데 오래 버틴 넷만 행으로 두고, 나머지는 서술로 갈음한다(헝가리 분열기 단순화 전례)
  { predecessor: '코르도바 칼리파국', successor: '세비야 타이파', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '코르도바 칼리파국', successor: '사라고사 타이파', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '코르도바 칼리파국', successor: '톨레도 타이파', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '코르도바 칼리파국', successor: '바다호스 타이파', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 타이파의 최후 ───────────────────────────────────────────────
  // 1085-05-25 알폰소 6세의 톨레도 입성
  { predecessor: '톨레도 타이파', successor: '카스티야 왕국 (초기)', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1091년 세비야 함락, 1094년 바다호스 병합, 1110년 사라고사 접수
  { predecessor: '세비야 타이파', successor: '무라비트 왕조', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '바다호스 타이파', successor: '무라비트 왕조', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '사라고사 타이파', successor: '무라비트 왕조', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1118-12 알폰소 1세가 사라고사를 되찾아 아라곤의 새 도읍으로 삼음
  { predecessor: '사라고사 타이파', successor: '아라곤 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 북아프리카 왕조의 교대 ──────────────────────────────────────
  // 1147년 압드 알무민의 마라케시 함락
  { predecessor: '무라비트 왕조', successor: '무와히드 왕조', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1238년 무와히드의 붕괴 속에서 나스르 가문이 그라나다를 차지
  { predecessor: '무와히드 왕조', successor: '그라나다 토후국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1212 라스 나바스 이후 1236 코르도바·1248 세비야 — 상대는 1230년 성립한 카스티야 왕관 행이다
  { predecessor: '무와히드 왕조', successor: '카스티야 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1249년 아폰수 3세의 알가르브 정복으로 포르투갈의 레콩키스타가 끝남
  { predecessor: '무와히드 왕조', successor: '포르투갈 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1238-10 하이메 1세의 발렌시아 입성(직접 상대는 자이얀의 발렌시아 타이파이나 별행을 두지 않는다)
  { predecessor: '무와히드 왕조', successor: '발렌시아 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1492-01-02 그라나다 함락
  { predecessor: '그라나다 토후국', successor: '카스티야 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 북부 기독교 왕국의 계보 ─────────────────────────────────────
  // 910년 궁정이 오비에도에서 레온으로 — 같은 나라의 중심 이동이지만 국호가 바뀌어 STATE_SUCCESSION으로 둔다
  { predecessor: '아스투리아스 왕국', successor: '레온 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 910년 알폰소 3세의 세 아들 분할 상속에서 갈리시아가 갈라짐
  { predecessor: '아스투리아스 왕국', successor: '갈리시아 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1065년 페르난도 1세의 유언으로 카스티야가 백국에서 왕국으로
  { predecessor: '카스티야 백국', successor: '카스티야 왕국 (초기)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1035년 산초 3세 대왕의 분할 상속 — 나바라에서 아라곤이 왕국으로 갈라져 나옴
  { predecessor: '나바라 왕국', successor: '아라곤 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아라곤 백국', successor: '아라곤 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1137년 약혼·1162년 알폰소 2세의 겸임으로 카탈루냐가 아라곤 왕관의 구성체가 됨(흡수 구성체라 UNION)
  { predecessor: '바르셀로나 백국', successor: '아라곤 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1143년 사모라 조약 — 모국이 살아 있는 상태에서 떨어져 나간 신생국이라 INDEPENDENCE
  { predecessor: '레온 왕국', successor: '포르투갈 왕국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1230년 페르난도 3세의 영구 통합 — 레온·갈리시아는 흡수되고 카스티야가 이어받는다
  { predecessor: '레온 왕국', successor: '카스티야 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '갈리시아 왕국', successor: '카스티야 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '카스티야 왕국 (초기)', successor: '카스티야 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1276년 하이메 1세의 유언으로 발레아레스·루시용이 갈라짐 ↔ 1349년 류크마조르에서 재병합
  { predecessor: '아라곤 왕국', successor: '마요르카 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '마요르카 왕국', successor: '아라곤 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1512년 페르난도 2세의 상나바라 병합 ↔ 1620년 하나바라의 프랑스 합병
  { predecessor: '나바라 왕국', successor: '카스티야 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '나바라 왕국', successor: '프랑스 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 제국과 단일 왕국 ────────────────────────────────────────────
  // 1492년 대서양 사업은 카스티야 왕관의 소유였다(아라곤은 지중해 몫) — 제국 행의 출발점
  { predecessor: '카스티야 왕국', successor: '스페인 제국', eventType: TransitionEventType.FOUNDED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1976-02 서사하라 철수로 해외 제국이 닫히고 본국만 남는다
  { predecessor: '스페인 제국', successor: '스페인 왕국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1707~1716 누에바 플란타 — 카스티야가 통일의 주도핵(UNIFICATION), 아라곤·발렌시아는 흡수 구성체(UNION)
  // (불가리아 배치에서 확정한 UNIFICATION/UNION 구분)
  { predecessor: '카스티야 왕국', successor: '스페인 왕국 (부르봉)', eventType: TransitionEventType.UNIFICATION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '아라곤 왕국', successor: '스페인 왕국 (부르봉)', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '발렌시아 왕국', successor: '스페인 왕국 (부르봉)', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 근현대 체제 교체 ────────────────────────────────────────────
  // 1808 바욘 양위 ↔ 1813 비토리아 패전 뒤 복귀: 같은 나라의 체제 교체 왕복 쌍(우크라이나국 판례)
  { predecessor: '스페인 왕국 (부르봉)', successor: '스페인 왕국 (보나파르트)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '스페인 왕국 (보나파르트)', successor: '스페인 왕국 (부르봉)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1873-02-11 아마데오 1세 퇴위와 공화국 선포
  { predecessor: '스페인 왕국 (부르봉)', successor: '스페인 제1공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1874-12-29 사군토 선언
  { predecessor: '스페인 제1공화국', successor: '스페인 왕국 (왕정복고)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1923-09 쿠데타 ↔ 1930-01 사임: 왕정 안에서의 정권 교체 왕복 쌍
  { predecessor: '스페인 왕국 (왕정복고)', successor: '프리모 데 리베라 독재', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '프리모 데 리베라 독재', successor: '스페인 왕국 (왕정복고)', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1931-04-14 공화국 선포
  { predecessor: '스페인 왕국 (왕정복고)', successor: '스페인 제2공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1939-04-01 내전 종전 선언
  { predecessor: '스페인 제2공화국', successor: '스페인국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1975-11-22 후안 카를로스 1세 즉위 — 프랑코 체제가 정한 절차를 따른 이행이라 REGIME_CHANGE
  { predecessor: '스페인국', successor: '스페인 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
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
  // ── 중세 이베리아 ───────────────────────────────────────────────
  // 850년경 변경 백국으로 출발해 932년 페르난 곤살레스가 사실상 자립할 때까지 레온 왕의 봉신
  { parent: '레온 왕국', member: '카스티야 백국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 갈리시아는 분할 상속 때마다 되살아나는 레온·카스티야 왕관 안의 왕국이었다
  { parent: '레온 왕국', member: '갈리시아 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 922년 팜플로나 왕국에 편입되어 나바라 왕가의 상속 재산이 됨
  { parent: '나바라 왕국', member: '아라곤 백국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 801~988 히스파니아 변경령 — 명목 종주권만 남은 시기도 포함한다(크림 칸국 판례)
  { parent: '프랑크 왕국', member: '바르셀로나 백국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 아라곤 왕관(복합 군주국)의 구성국 — 각자 법과 의회를 유지했다
  { parent: '아라곤 왕국', member: '바르셀로나 백국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER, startDate: '1137-08-11' },
  { parent: '아라곤 왕국', member: '발렌시아 왕국', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 1279년 페르피냥 조약으로 마요르카 왕이 아라곤 왕의 봉신이 됨 ~ 1343년 침공
  { parent: '아라곤 왕국', member: '마요르카 왕국', role: HistoricalMembershipRole.VASSAL_STATE, startDate: '1279-01-20', endDate: '1343-05-31' },
  // 1246년 하엔 조약 — 파리아를 바치고 병력을 대는 대가로 존속한 속국(명목 종주권만으로도 VASSAL_STATE)
  { parent: '카스티야 왕국', member: '그라나다 토후국', role: HistoricalMembershipRole.VASSAL_STATE },

  // ── 나폴레옹기 ──────────────────────────────────────────────────
  // 나폴레옹이 형을 앉힌 위성 왕국(알바니아 이탈리아 보호령 판례와 같은 자리)
  { parent: '프랑스 제1제국', member: '스페인 왕국 (보나파르트)', role: HistoricalMembershipRole.PROTECTORATE },

  // ── 해외 제국 ───────────────────────────────────────────────────
  { parent: '스페인 제국', member: '누에바에스파냐 부왕령', role: HistoricalMembershipRole.COLONY },
  { parent: '스페인 제국', member: '페루 부왕령', role: HistoricalMembershipRole.COLONY },
  { parent: '스페인 제국', member: '누에바그라나다 부왕령', role: HistoricalMembershipRole.COLONY },
  { parent: '스페인 제국', member: '리오데라플라타 부왕령', role: HistoricalMembershipRole.COLONY },
  // 필리핀은 1821년까지 누에바에스파냐 부왕의 관할이었고 그 뒤 본국 직할로 바뀌었다 — 두 부모를 각각 단다
  { parent: '누에바에스파냐 부왕령', member: '필리핀 도독령', role: HistoricalMembershipRole.COLONY, startDate: '1565-04-27', endDate: '1821-09-27' },
  { parent: '스페인 제국', member: '필리핀 도독령', role: HistoricalMembershipRole.COLONY, startDate: '1821-09-27' },
  { parent: '스페인 제국', member: '스페인령 기니', role: HistoricalMembershipRole.COLONY },
  { parent: '스페인 제국', member: '스페인령 사하라', role: HistoricalMembershipRole.COLONY },
  // 술탄의 명목 주권 아래 스페인이 행정을 맡은 보호령이라 PROTECTORATE
  { parent: '스페인 제국', member: '스페인령 모로코', role: HistoricalMembershipRole.PROTECTORATE },
  // 유럽 쪽 속령 — 자체 군주 없이 스페인 왕이 주권자를 겸한 왕관령이라 DOMINION(스웨덴 발트 속령 전례).
  // 세 행 모두 다른 시드(benelux·italy) 소유라 여기서는 소속 관계만 additive로 얹는다
  { parent: '스페인 제국', member: '스페인령 네덜란드', role: HistoricalMembershipRole.DOMINION, startDate: '1581-07-26', endDate: '1714-03-07' },
  { parent: '스페인 제국', member: '나폴리 왕국', role: HistoricalMembershipRole.DOMINION, startDate: '1504-01-31', endDate: '1713-04-11' },
  { parent: '스페인 제국', member: '밀라노 공국', role: HistoricalMembershipRole.DOMINION, startDate: '1535-11-01', endDate: '1706-09-24' },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 가톨릭 공동왕의 결합 — 두 왕관은 1715년 누에바 플란타까지 각자의 법·의회·화폐를 유지한 동군연합이었다.
  // 이 배치가 1479~1715년에 '스페인'이라는 단일 행을 두지 않는 근거이기도 하다
  { subject: '카스티야 왕국', object: '아라곤 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1479-01-20', endDate: '1716-01-16' },
  // 이베리아 연합 — 1581-04-16 토마르 의회가 펠리페 2세를 포르투갈 왕으로 인정 ~ 1640-12-01 복고 혁명
  { subject: '카스티야 왕국', object: '포르투갈 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1581-04-16', endDate: '1640-12-01' },
  // 1282-08-30 시칠리아 만종 사건 뒤 페드로 3세의 즉위 ~ 1713-04-11 위트레흐트 조약.
  // 1296~1409년 방계 왕조기가 끼어 있으나 (subject, object, type) 유니크라 한 행으로 합친다
  { subject: '아라곤 왕국', object: '시칠리아 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1282-08-30', endDate: '1713-04-11' },
]

export async function seedSpainHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 스페인 역사 국가 계승·소속 관계 시딩 시작...')

  // 이름 → id 맵 구축
  const nameToId = new Map<string, string>()
  const allNames = new Set([
    ...TRANSITIONS.map((transition) => transition.predecessor),
    ...TRANSITIONS.map((transition) => transition.successor),
    ...MEMBERSHIPS.map((membership) => membership.parent),
    ...MEMBERSHIPS.map((membership) => membership.member),
    ...RELATIONS.map((relation) => relation.subject),
    ...RELATIONS.map((relation) => relation.object),
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

  // ── 수평 관계(동군연합) ────────────────────────────────────────────
  console.log('\n  👑 수평 관계(동군연합) 등록...')
  let relationCount = 0
  for (const relation of RELATIONS) {
    const subjectCountryId = nameToId.get(relation.subject)
    const objectCountryId = nameToId.get(relation.object)
    if (!subjectCountryId || !objectCountryId) continue

    const exists = await prisma.historicalCountryRelation.findFirst({
      where: {
        subjectCountryId,
        objectCountryId,
        relationType: relation.relationType,
      },
    })
    if (!exists) {
      await prisma.historicalCountryRelation.create({
        data: {
          subjectCountryId,
          objectCountryId,
          relationType: relation.relationType,
          startDate: relation.startDate ? new Date(`${relation.startDate}T00:00:00Z`) : undefined,
          endDate: relation.endDate ? new Date(`${relation.endDate}T00:00:00Z`) : undefined,
        },
      })
      console.log(`    ✅ ${relation.subject} ↔ ${relation.object} (${relation.relationType})`)
      relationCount++
    } else {
      console.log(`    ♻️  ${relation.subject} ↔ ${relation.object}`)
    }
  }

  console.log(`\n✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건, 수평 관계 ${relationCount}건 완료\n`)
}
