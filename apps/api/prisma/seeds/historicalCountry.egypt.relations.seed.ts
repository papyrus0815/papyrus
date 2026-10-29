import {
  HistoricalMembershipRole,
  HistoricalRelationType,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const { CONQUEST, DISSOLVED, INDEPENDENCE, SPLIT, SUCCESSION, UNIFICATION } = TransitionEventType
const { STATE_SUCCESSION, REGIME_CHANGE } = TransitionScope

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// { predecessor, successor, eventType, transitionScope }
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // ── 파라오 시대: 통일 왕정 ↔ 분열기 ─────────────────────────────
  // 같은 나일 국가의 시대 교대 — 통일→분열은 SPLIT, 분열→재통일은 UNIFICATION(재통일 주도핵=테베 왕가)
  { predecessor: '이집트 초기 왕조', successor: '이집트 고왕국', eventType: SUCCESSION, transitionScope: REGIME_CHANGE },
  { predecessor: '이집트 고왕국', successor: '이집트 제1중간기', eventType: SPLIT, transitionScope: STATE_SUCCESSION },
  // 기원전 2055년경 테베의 멘투호테프 2세가 헤라클레오폴리스를 꺾고 재통일
  { predecessor: '이집트 제1중간기', successor: '이집트 중왕국', eventType: UNIFICATION, transitionScope: STATE_SUCCESSION },
  { predecessor: '이집트 중왕국', successor: '이집트 제2중간기', eventType: SPLIT, transitionScope: STATE_SUCCESSION },
  // 기원전 1550년경 아흐모세 1세의 아바리스 함락
  { predecessor: '이집트 제2중간기', successor: '이집트 신왕국', eventType: UNIFICATION, transitionScope: STATE_SUCCESSION },
  { predecessor: '이집트 신왕국', successor: '이집트 제3중간기', eventType: SPLIT, transitionScope: STATE_SUCCESSION },
  // 신왕국의 누비아 총독령이 무너지며 쿠시가 자립 — 모국이 남은 채 떨어져 나간 신생국이라 INDEPENDENCE
  { predecessor: '이집트 신왕국', successor: '쿠시 왕국', eventType: INDEPENDENCE, transitionScope: STATE_SUCCESSION },
  // 기원전 656년 프삼티크 1세가 테베까지 장악해 재통일(제25왕조 쿠시 세력 축출)
  { predecessor: '이집트 제3중간기', successor: '이집트 사이스 왕조', eventType: UNIFICATION, transitionScope: STATE_SUCCESSION },

  // ── 페르시아와 마케도니아 ───────────────────────────────────────
  // 기원전 525년 펠루시온 전투 — 이집트는 사트라피가 되어 별행 없이 제국 행으로 흡수된다
  { predecessor: '이집트 사이스 왕조', successor: '아케메네스 제국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  // 기원전 404년 아미르타이오스의 반란 ↔ 기원전 343년 아르타크세르크세스 3세의 재정복(왕복 쌍 — 오제국↔일리리아 판례)
  { predecessor: '아케메네스 제국', successor: '이집트 말기 왕조', eventType: INDEPENDENCE, transitionScope: STATE_SUCCESSION },
  { predecessor: '이집트 말기 왕조', successor: '아케메네스 제국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  // 기원전 334~330년 알렉산드로스 3세의 원정 — 알렉산드로스 제국은 별행이 없어 마케도니아 왕국이 받는다
  { predecessor: '아케메네스 제국', successor: '마케도니아 왕국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  // 기원전 305년 디아도코이 분할 — 프톨레마이오스 1세의 왕호 선언
  { predecessor: '마케도니아 왕국', successor: '프톨레마이오스 왕국', eventType: SPLIT, transitionScope: STATE_SUCCESSION },
  // 기원전 30년 8월 옥타비아누스의 알렉산드리아 입성 — 제정 성립(기원전 27) 이전이라 공화국이 받는다
  { predecessor: '프톨레마이오스 왕국', successor: '로마 공화국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  // 395년 테오도시우스 1세 사후 동·서 분할. 서로마 쪽 엣지(SPLIT)만 있고 동로마 쪽이 비어 있어
  // 이집트 속주의 계보(로마→동로마→라시둔)가 끊겼다 — 이 배치에서 대칭으로 보강한다
  { predecessor: '로마 제국', successor: '동로마 제국', eventType: SPLIT, transitionScope: STATE_SUCCESSION },

  // ── 이슬람 칼리파국 ─────────────────────────────────────────────
  // 639~642년 아므르 이븐 알아스의 이집트 정복(642년 알렉산드리아 인도). 619~629년 사산 점령기는 별행 없음
  { predecessor: '동로마 제국', successor: '라시둔 칼리파국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  // 661년 알리 암살 뒤 무아위야의 칼리파위 확립 — 선출제에서 세습 왕조로
  { predecessor: '라시둔 칼리파국', successor: '우마이야 칼리파국', eventType: SUCCESSION, transitionScope: STATE_SUCCESSION },
  // 750년 자브강 전투 — 아바스 혁명
  { predecessor: '우마이야 칼리파국', successor: '아바스 칼리파국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  // 868년 툴룬 자립 ↔ 905년 아바스 재정복 / 935년 이흐시드 자립
  { predecessor: '아바스 칼리파국', successor: '툴룬 왕조', eventType: INDEPENDENCE, transitionScope: STATE_SUCCESSION },
  { predecessor: '툴룬 왕조', successor: '아바스 칼리파국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },
  { predecessor: '아바스 칼리파국', successor: '이흐시드 왕조', eventType: INDEPENDENCE, transitionScope: STATE_SUCCESSION },
  // 969년 자우하르의 푸스타트 입성
  { predecessor: '이흐시드 왕조', successor: '파티마 칼리파국', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },

  // ── 술탄국 시대 ─────────────────────────────────────────────────
  // 1171년 재상 살라흐 앗딘의 칼리파국 폐지 — 내부 권력 이양이라 정복이 아니다
  { predecessor: '파티마 칼리파국', successor: '아이유브 왕조', eventType: SUCCESSION, transitionScope: STATE_SUCCESSION },
  // 1250년 5월 맘루크 친위대의 술탄 투란샤 살해
  { predecessor: '아이유브 왕조', successor: '맘루크 술탄국', eventType: SUCCESSION, transitionScope: STATE_SUCCESSION },
  // 1517년 1월 라이다니야 전투 — 정복으로 오스만의 주(오스만령 이집트)가 된다.
  // (예전엔 별행 없이 '맘루크 → 오스만 제국'으로 이었다 — 옛 엣지는 fix-egypt-ottoman-edges.ts가 지운다)
  { predecessor: '맘루크 술탄국', successor: '오스만령 이집트', eventType: CONQUEST, transitionScope: STATE_SUCCESSION },

  // ── 근현대 ──────────────────────────────────────────────────────
  // 1805년 5월 무함마드 알리 집권 — 같은 이집트의 체제 교체(총독 주 → 세습 자치국). 자기 전신의 체제 전환은
  // INDEPENDENCE가 아니라 SUCCESSION/REGIME_CHANGE(러시아 판례). 오스만과의 끈은 소속(VASSAL_STATE)이 맡는다.
  // (예전 '오스만 제국 → 헤디브국 INDEPENDENCE'는 전신 행이 없던 시절의 대체 엣지 — fix 스크립트가 지운다)
  { predecessor: '오스만령 이집트', successor: '이집트 헤디브국', eventType: SUCCESSION, transitionScope: REGIME_CHANGE },
  // 1914-12 영국 보호국 선포 / 1922-02 독립 선언 / 1953-06 공화국 선포 — 같은 나라의 체제 교체
  // (자기 전신의 체제 전환은 INDEPENDENCE가 아니라 SUCCESSION/REGIME_CHANGE — 러시아 판례)
  { predecessor: '이집트 헤디브국', successor: '이집트 술탄국', eventType: SUCCESSION, transitionScope: REGIME_CHANGE },
  { predecessor: '이집트 술탄국', successor: '이집트 왕국', eventType: SUCCESSION, transitionScope: REGIME_CHANGE },
  { predecessor: '이집트 왕국', successor: '이집트 공화국', eventType: SUCCESSION, transitionScope: REGIME_CHANGE },
  // 1958-02 시리아와의 합병 — 통일 주도핵(이집트)→신설 통일국은 UNIFICATION(불가리아 판례).
  // 시리아 쪽 전신(시리아 공화국)은 미등록이라 엣지 없음
  { predecessor: '이집트 공화국', successor: '아랍 연합 공화국', eventType: UNIFICATION, transitionScope: STATE_SUCCESSION },
  // 1971-09 국호 변경 — 같은 나라
  { predecessor: '아랍 연합 공화국', successor: '이집트 아랍 공화국', eventType: SUCCESSION, transitionScope: REGIME_CHANGE },
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
  // 아바스 칼리파의 명목 종주권 아래 사실상 독립한 총독 왕조 — 명목 종주권만으로도 VASSAL_STATE(몬테네그로 판례)
  { parent: '아바스 칼리파국', member: '툴룬 왕조', role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '아바스 칼리파국', member: '이흐시드 왕조', role: HistoricalMembershipRole.VASSAL_STATE },
  // 술탄이 임명한 총독이 다스린 주 — 자체 군주는 없되 자체 법전·군단·정액 공납을 지닌 특권주라
  // 본국 총독 직할의 해외령(COLONY: 베네치아령 알바니아·스페인 부왕령)보다 자치령(DOMINION: 동루멜리아·스웨덴령 에스토니아)에 가깝다
  { parent: '오스만 제국', member: '오스만령 이집트', role: HistoricalMembershipRole.DOMINION },
  // 1914-11-05 오스만의 협상국 상대 참전으로 종주권 단절
  { parent: '오스만 제국', member: '이집트 헤디브국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 1914-12-18 보호국 선포 ~ 1922-02-28 일방적 독립 선언(1882~1914 '베일 덮인 보호국'은 법적 지위가 아니라 제외)
  { parent: '대영제국', member: '이집트 술탄국', role: HistoricalMembershipRole.PROTECTORATE, startDate: '1914-12-18', endDate: '1922-02-28' },
]

// ── 수평 관계 정의 ────────────────────────────────────────────────────────────
// 이 배치에는 없다(동군연합 0건). 시드 함수 형태를 다른 지역과 맞추려고 빈 배열로 둔다.
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = []

export async function seedEgyptHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 이집트 역사 국가 계승·소속 관계 시딩 시작...')

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
