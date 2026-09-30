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
  // ── 고대 로마 계승 ─────────────────────────────────────────────────
  // 기원전 509년: 왕정 타도 → 공화정 수립
  { predecessor: '로마 왕국',    successor: '로마 공화국',  eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 기원전 27년: 아우구스투스 즉위 → 제국 성립
  { predecessor: '로마 공화국',  successor: '로마 제국',    eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 395년: 테오도시우스 사후 동서 분열
  { predecessor: '로마 제국',    successor: '서로마 제국',  eventType: TransitionEventType.SPLIT,       transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 민족 이동기 ────────────────────────────────────────────────────
  // 476년: 오도아케르가 마지막 황제를 폐위 → 오도아케르 왕국
  //   (예전엔 서로마→동고트 직결이었다 — 기존 DB의 그 엣지는 scripts/fix-italy-odoacer-edge.ts가 지운다)
  { predecessor: '서로마 제국',     successor: '오도아케르 왕국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 493년: 테오도리쿠스가 라벤나 포위 끝에 오도아케르를 살해 → 동고트 왕국
  { predecessor: '오도아케르 왕국', successor: '동고트 왕국',     eventType: TransitionEventType.CONQUEST,  transitionScope: TransitionScope.STATE_SUCCESSION },
  // 568년: 동로마 재정복 후 랑고바르드 침공
  { predecessor: '동고트 왕국',  successor: '랑고바르드 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 중세 ────────────────────────────────────────────────────────────
  // 774년: 카롤루스 대제 랑고바르드 정복 → 교황령 수립 (756년 피핀 증여가 기원이나
  //        랑고바르드 멸망이 교황령 확립의 계기)
  { predecessor: '랑고바르드 왕국', successor: '교황령',    eventType: TransitionEventType.CONQUEST,    transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1198년: 인노첸시오 3세가 황제파 공작을 몰아내고 스폴레토를 교황령에 병합
  { predecessor: '스폴레토 공국',  successor: '교황령',      eventType: TransitionEventType.CONQUEST,    transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1077년: 마지막 군주 란돌포 6세 사후 도시 베네벤토가 교황령으로(나머지 영토는 노르만 — 해당 행 미등록)
  { predecessor: '베네벤토 공국',  successor: '교황령',      eventType: TransitionEventType.DISSOLVED,   transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 도시 공화국 소멸 ────────────────────────────────────────────────
  // 1797년: 나폴레옹이 베네치아·제노바 공화국 해체 (직계 후임국 없음 → 사르데냐로 편입)
  // → 역사적으로 사르데냐 왕국이 이 지역을 흡수
  { predecessor: '베네치아 공화국', successor: '사르데냐 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '제노바 공화국',   successor: '사르데냐 왕국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 르네상스 → 근세 ─────────────────────────────────────────────────
  // 1532년: 피렌체 공화국 → 피렌체 공국 → 1569년 토스카나 대공국
  { predecessor: '피렌체 공화국',  successor: '토스카나 대공국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 나폴레옹 이후 통합 ───────────────────────────────────────────────
  // 1816년: 나폴리 왕국 + 시칠리아 왕국 → 양시칠리아 왕국
  { predecessor: '나폴리 왕국',    successor: '양시칠리아 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '시칠리아 왕국',  successor: '양시칠리아 왕국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 이탈리아 통일 (리소르지멘토) ────────────────────────────────────
  // 1861년: 사르데냐 왕국이 이탈리아 왕국 선포 (핵심 계승)
  { predecessor: '사르데냐 왕국',  successor: '이탈리아 왕국', eventType: TransitionEventType.UNIFICATION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1861년: 양시칠리아 왕국 가리발디 원정으로 병합
  { predecessor: '양시칠리아 왕국', successor: '이탈리아 왕국', eventType: TransitionEventType.CONQUEST,   transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1860년: 토스카나 대공국 주민투표로 합류
  { predecessor: '토스카나 대공국', successor: '이탈리아 왕국', eventType: TransitionEventType.UNION,       transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1870년: 교황령 로마 병합
  { predecessor: '교황령',          successor: '이탈리아 왕국', eventType: TransitionEventType.CONQUEST,    transitionScope: TransitionScope.STATE_SUCCESSION },

  // ── 파시즘 ─────────────────────────────────────────────────────────
  // 1922년: 무솔리니 집권 → 파시스트 이탈리아 (이탈리아 왕국 내 정권 교체)
  { predecessor: '이탈리아 왕국',    successor: '파시스트 이탈리아',      eventType: TransitionEventType.OTHER,       transitionScope: TransitionScope.REGIME_CHANGE },
  // 1943년: 무솔리니 실각 후 살로 공화국 수립 (이탈리아 왕국과 병행)
  { predecessor: '파시스트 이탈리아', successor: '이탈리아 사회 공화국',  eventType: TransitionEventType.SPLIT,       transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 밀라노 공국은 명목상 신성로마제국 내 제후였으나, 이 데이터에서는 이탈리아 맥락에서만 기록
  // 나폴리·시칠리아 → 양시칠리아 구성
  { parent: '양시칠리아 왕국', member: '나폴리 왕국',   role: HistoricalMembershipRole.UNION },
  { parent: '양시칠리아 왕국', member: '시칠리아 왕국',  role: HistoricalMembershipRole.UNION },
  // 오도아케르: 황제 휘장을 반환하고 제논의 명목 종주권 인정(파트리키우스) — 명목 종주권 VASSAL_STATE 선례
  { parent: '동로마 제국',     member: '오도아케르 왕국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 랑고바르드 남·중부 두 공국 — 왕권 아래 공작령(사실상 자립)
  { parent: '랑고바르드 왕국', member: '스폴레토 공국',  role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '랑고바르드 왕국', member: '베네벤토 공국',  role: HistoricalMembershipRole.VASSAL_STATE },
  // 스폴레토: 776년 프랑크 공작령 편입 → 962년 이후 신성로마제국 이탈리아 왕국의 봉토
  { parent: '프랑크 왕국',     member: '스폴레토 공국',  role: HistoricalMembershipRole.VASSAL_STATE },
  { parent: '신성로마제국',    member: '스폴레토 공국',  role: HistoricalMembershipRole.VASSAL_STATE },
  // 베네벤토: 787년 아레키스 2세가 카롤루스 대제에게 조공 약속(명목 종주권 — 오스만←불가리아 공국 선례)
  { parent: '프랑크 왕국',     member: '베네벤토 공국',  role: HistoricalMembershipRole.VASSAL_STATE },
]

export async function seedItalyHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 이탈리아 역사 국가 계승·소속 관계 시딩 시작...')

  // ── 계승 관계 ────────────────────────────────────────────────────
  for (const t of TRANSITIONS) {
    const predecessor = await prisma.historicalCountry.findFirst({
      where: { name: t.predecessor },
      select: { id: true },
    })
    const successor = await prisma.historicalCountry.findFirst({
      where: { name: t.successor },
      select: { id: true },
    })

    if (!predecessor) {
      console.warn(`  ⚠️  전임 국가를 찾을 수 없음: ${t.predecessor}`)
      continue
    }
    if (!successor) {
      console.warn(`  ⚠️  후임 국가를 찾을 수 없음: ${t.successor}`)
      continue
    }

    const existing = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId: predecessor.id, successorId: successor.id },
    })

    if (existing) {
      console.log(`  ⏭️  ${t.predecessor} → ${t.successor}`)
    } else {
      await prisma.historicalCountryTransition.create({
        data: {
          predecessorId: predecessor.id,
          successorId: successor.id,
          eventType: t.eventType,
          transitionScope: t.transitionScope,
        },
      })
      console.log(`  ✅ ${t.predecessor} → ${t.successor}`)
    }
  }

  // ── 소속 관계 ────────────────────────────────────────────────────
  for (const m of MEMBERSHIPS) {
    const parent = await prisma.historicalCountry.findFirst({
      where: { name: m.parent },
      select: { id: true },
    })
    const member = await prisma.historicalCountry.findFirst({
      where: { name: m.member },
      select: { id: true },
    })

    if (!parent) {
      console.warn(`  ⚠️  부모 국가를 찾을 수 없음: ${m.parent}`)
      continue
    }
    if (!member) {
      console.warn(`  ⚠️  소속 국가를 찾을 수 없음: ${m.member}`)
      continue
    }

    const existing = await prisma.historicalCountryMembership.findFirst({
      where: { historicalCountryId: parent.id, memberCountryId: member.id },
    })

    if (existing) {
      console.log(`  ⏭️  [소속] ${m.member} ∈ ${m.parent}`)
    } else {
      await prisma.historicalCountryMembership.create({
        data: {
          historicalCountryId: parent.id,
          memberCountryId: member.id,
          role: m.role,
          isLeadingMember: m.isLeadingMember ?? false,
        },
      })
      console.log(`  ✅ [소속] ${m.member} ∈ ${m.parent}`)
    }
  }

  console.log(
    `✅ 이탈리아 역사 국가 계승 관계 시딩 완료 (계승 ${TRANSITIONS.length}건, 소속 ${MEMBERSHIPS.length}건)\n`,
  )
}
