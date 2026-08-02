import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 계승 관계 정의 ────────────────────────────────────────────────────────────
// 동로마 제국·오스만 제국은 사건 시드(콘스탄티노플 함락·크림 전쟁) 유래 노드 — 이름 기반 조회라
// 파이프라인 첫 실행 순서상 없으면 warn+skip되고 재실행에서 채워진다.
const TRANSITIONS: {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}[] = [
  // 쿠브라트 사후 와해 → 아스파루흐 남하·다뉴브 건국 (668→681, 13년 갭은 카란타니아→케른텐 선례)
  { predecessor: '고대 대불가리아', successor: '불가리아 제1제국', eventType: TransitionEventType.DISSOLVED, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 크룸의 동부 아바르 잔존령 병합 (804~805 — 프랑크 서부·불가르 동부 분할 흡수)
  { predecessor: '아바르 칸국', successor: '불가리아 제1제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 바실리오스 2세의 정복·병합 (1018)
  { predecessor: '불가리아 제1제국', successor: '동로마 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 아센·페터르 봉기로 동로마에서 이탈 재건 (1185)
  { predecessor: '동로마 제국', successor: '불가리아 제2제국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 오스만 정복 (1393 터르노보·1395 니코폴·1396 비딘)
  { predecessor: '불가리아 제2제국', successor: '오스만 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 베를린 조약으로 자치 공국·자치주 성립 (1878)
  { predecessor: '오스만 제국', successor: '불가리아 공국', eventType: TransitionEventType.INDEPENDENCE, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '오스만 제국', successor: '동루멜리아', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 동루멜리아의 공국 흡수 통합 (1885 — UNIFICATION은 '통일 주도핵→신설 통일국' 전용이라
  // 존속국에 흡수되는 구성체는 UNION이 corpus 정본: 머시아→잉글랜드·바이에른→독일 제국 유형)
  { predecessor: '동루멜리아', successor: '불가리아 공국', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 완전 독립·차르국 승격 (1908 — 세르비아 공국→왕국 SUCCESSION/REGIME_CHANGE 선례)
  { predecessor: '불가리아 공국', successor: '불가리아 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 군주제 폐지 국민투표 (1946)
  { predecessor: '불가리아 왕국', successor: '불가리아 인민 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 민주화·국명 변경 (1990)
  { predecessor: '불가리아 인민 공화국', successor: '불가리아 공화국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 불가리아 공국: 자체 군주를 가진 조공 속국(1878~1908) — 오스만←두브로브니크 VASSAL_STATE 선례
  { parent: '오스만 제국', member: '불가리아 공국', role: HistoricalMembershipRole.VASSAL_STATE },
  // 동루멜리아: 술탄이 총독을 직접 임명하는 직할 자치주(자체 군주 없음)라 속국이 아닌 자치령
  { parent: '오스만 제국', member: '동루멜리아', role: HistoricalMembershipRole.DOMINION },
]

export async function seedBulgariaHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 불가리아 역사 국가 계승·소속 관계 시딩 시작...')

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
