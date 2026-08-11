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
  // 1392년(음 7월) 이성계가 공양왕을 폐하고 즉위한 역성혁명. 지배 가문과 국호가 교체되었을 뿐
  // 관료 기구·강역·주민이 연속되므로 STATE_SUCCESSION이 아닌 REGIME_CHANGE
  // ('알바니아 제1공화국 → 알바니아 왕국 (근대)' 판례와 동형: 국호 변경 ≠ 국가 교체)
  { predecessor: '고려', successor: '조선', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1897-10-12 고종의 환구단 즉위·칭제건원. 동일 군주·동일 왕조(전주 이씨)가 왕국을 제국으로
  // 격상한 국체 전환이라 전형적인 REGIME_CHANGE이며 전임 end == 후임 start를 공유한다
  { predecessor: '조선', successor: '대한제국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 1910-08-29 한일병합조약 공포로 대한제국이 소멸하고 국가기구가 조선총독부로 완전 대체.
  // 형식은 조약이지만 1905 을사늑약·1907 정미조약과 군대 해산으로 저항 수단을 제거한 뒤의
  // 강제 병합이라 TREATY가 아닌 CONQUEST를 택했다(피병합 → 병합국 방향은
  // '일리리아 왕국 → 로마 공화국' 판례와 동형). 총독부 통치기는 별도 행을 만들지 않는다
  { predecessor: '대한제국', successor: '일본 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// 코퍼스 관행은 날짜를 비워 두는 것이지만, 아래 두 건은 알바니아 배치가 UNION 2건에 날짜를
// 넣은 것과 같은 이유로 예외를 적용한다 — 종속 구간이 행의 존속 구간보다 훨씬 짧아서
// 날짜가 없으면 "조선 = 청의 속국(1392~1897 내내)"으로 오독된다.
// 날짜는 사료로 확정된 양력만 쓴다(음력 추정일은 넣지 않는다).
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  startDate?: string
  endDate?: string
  isLeadingMember?: boolean
}[] = [
  // 1637-01-30 삼전도 항복으로 명과의 사대 관계를 끊고 청의 책봉을 받았고,
  // 1895-04-17 시모노세키 조약 제1조가 조선의 완전 자주독립을 확인하며 종료.
  // 조공·책봉과 연호 사용에도 내정·왕위 계승은 자율이었고 청의 상주 통치 기관이 없어
  // PROTECTORATE가 아닌 VASSAL_STATE(알바니아 ← 로마 판정 규약과 동형).
  // ※ 1392~1637의 대명 사대 관계는 코퍼스에 '명나라' 행이 아직 없어 등록하지 못했다.
  //    명나라 행이 생기면 { parent: '명나라', member: '조선', role: VASSAL_STATE,
  //    startDate: '1401-…', endDate: '1637-01-30' } 한 줄을 여기에 추가할 것.
  { parent: '청나라', member: '조선', role: HistoricalMembershipRole.VASSAL_STATE, startDate: '1637-01-30', endDate: '1895-04-17' },
  // 1905-11-17 을사늑약으로 외교권이 박탈되고 통감부가 설치된 뒤 1910-08-29 병합까지.
  // 자체 황제·정부를 존치한 채 외교·군사·재정이 통감에게 귀속된 전형적 보호국
  // (알바니아 왕국 (이탈리아 보호령) 판례와 동형)
  { parent: '일본 제국', member: '대한제국', role: HistoricalMembershipRole.PROTECTORATE, startDate: '1905-11-17', endDate: '1910-08-29' },
  // 1270년 개경 환도부터 1356년 공민왕의 반원 개혁까지 이어진 원 간섭기.
  // 고려 왕이 원 황실의 부마가 되고 정동행성이 설치되었으나 국호·왕조·독자 관제를 유지해
  // 병합이 아닌 종속이다. 코퍼스에 '원나라' 행이 없어 지금은 등록하지 못하며,
  // 원나라 행이 생기면 { parent: '원나라', member: '고려', role: VASSAL_STATE }를 추가할 것.
]

export async function seedJoseonHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 조선 왕조 역사 국가 계승·소속 관계 시딩 시작...')

  // 이름 → id 맵 구축 (완전 일치 조회 — '조선'이 '조선민주주의인민공화국'을 잡지 않는다)
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
