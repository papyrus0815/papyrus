import {
  HistoricalMembershipRole,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 리투아니아(1915~) 계승·소속 관계.
 *
 * 의존(없으면 warn+skip, 재실행에서 채움): 러시아 제국·리투아니아/라트비아/에스토니아/벨로루시 SSR·소련(russia 시드),
 * 독일 제국·나치 독일(germany 시드), 폴란드 제2공화국(poland 시드).
 *
 * - 오버 오스트: 러시아 제국 서북부를 1915년 독일이 점령 → CONQUEST. 그 통치 아래 1918년 독립 → INDEPENDENCE
 *   ("모국→이탈 신생국" 방향 전용 규약). 독일 직할 통치구라 [독일 제국] PROTECTORATE(우크라이나 제국판무관부 판례).
 * - 중부 리투아니아: 리투아니아가 존속한 채 빌뉴스 일대가 떨어져 나감 → SPLIT. 1922 폴란드에 흡수 → UNION
 *   (흡수 구성체는 UNION — 머시아→잉글랜드형).
 * - 1940 소련 진주 → CONQUEST(폴란드 제2공화국→소련 선례). 1941·1944 독소 양방향 점령 → CONQUEST 왕복
 *   (우크라이나 SSR↔우크라이나 제국판무관부 선례). 오스트란트는 발트 3국·벨라루스 서부 네 총관구라 네 SSR 모두 왕복.
 * - 1990 회복: 리투아니아 SSR 최고회의가 회복 법령 채택 → SUCCESSION, 소련에서 이탈 → INDEPENDENCE
 *   (우크라이나 SSR→우크라이나 공화국·소련→우크라이나 공화국 선례).
 */

interface TransitionEntry {
  predecessor: string
  successor: string
  eventType: TransitionEventType
  transitionScope: TransitionScope
}

interface MembershipEntry {
  parent: string
  member: string
  role: HistoricalMembershipRole
}

const LT_SSR = '리투아니아 소비에트 사회주의 공화국'
const OSTLAND = '오스트란트 제국판무관부'
const OSTLAND_SSRS = [
  LT_SSR,
  '라트비아 소비에트 사회주의 공화국',
  '에스토니아 소비에트 사회주의 공화국',
  '벨로루시 소비에트 사회주의 공화국',
]

const conquest = (predecessor: string, successor: string): TransitionEntry => ({
  predecessor,
  successor,
  eventType: TransitionEventType.CONQUEST,
  transitionScope: TransitionScope.STATE_SUCCESSION,
})

const TRANSITIONS: TransitionEntry[] = [
  conquest('러시아 제국', '오버 오스트'),
  {
    predecessor: '오버 오스트',
    successor: '리투아니아 제1공화국',
    eventType: TransitionEventType.INDEPENDENCE,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
  {
    predecessor: '리투아니아 제1공화국',
    successor: '중부 리투아니아',
    eventType: TransitionEventType.SPLIT,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
  {
    predecessor: '중부 리투아니아',
    successor: '폴란드 제2공화국',
    eventType: TransitionEventType.UNION,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
  conquest('리투아니아 제1공화국', LT_SSR),
  ...OSTLAND_SSRS.flatMap((ssr) => [conquest(ssr, OSTLAND), conquest(OSTLAND, ssr)]),
  {
    predecessor: LT_SSR,
    successor: '리투아니아 공화국',
    eventType: TransitionEventType.SUCCESSION,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
  {
    predecessor: '소비에트 사회주의 공화국 연방',
    successor: '리투아니아 공화국',
    eventType: TransitionEventType.INDEPENDENCE,
    transitionScope: TransitionScope.STATE_SUCCESSION,
  },
]

const MEMBERSHIPS: MembershipEntry[] = [
  { parent: '독일 제국', member: '오버 오스트', role: HistoricalMembershipRole.PROTECTORATE },
  { parent: '나치 독일 (제3제국)', member: OSTLAND, role: HistoricalMembershipRole.PROTECTORATE },
]

export async function seedLithuaniaHistoricalCountryRelations(prisma: PrismaService): Promise<void> {
  console.log('\n🔗 리투아니아 역사 국가 계승·소속 관계 시딩...')

  const names = [
    ...new Set([
      ...TRANSITIONS.flatMap((transition) => [transition.predecessor, transition.successor]),
      ...MEMBERSHIPS.flatMap((membership) => [membership.parent, membership.member]),
    ]),
  ]
  const rows = await prisma.historicalCountry.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  })
  const nameToId = new Map(rows.map((row) => [row.name, row.id]))
  for (const name of names) {
    if (!nameToId.has(name)) console.warn(`  ⚠️  역사 국가 미등록: ${name} — 관련 관계는 재실행에서 채움`)
  }

  let transitionCount = 0
  for (const transition of TRANSITIONS) {
    const predecessorId = nameToId.get(transition.predecessor)
    const successorId = nameToId.get(transition.successor)
    if (!predecessorId || !successorId) continue
    const exists = await prisma.historicalCountryTransition.findFirst({ where: { predecessorId, successorId } })
    if (exists) {
      console.log(`    ♻️  ${transition.predecessor} → ${transition.successor}`)
      continue
    }
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
  }

  let membershipCount = 0
  for (const membership of MEMBERSHIPS) {
    const parentId = nameToId.get(membership.parent)
    const memberId = nameToId.get(membership.member)
    if (!parentId || !memberId) continue
    const exists = await prisma.historicalCountryMembership.findFirst({
      where: { historicalCountryId: parentId, memberCountryId: memberId },
    })
    if (exists) {
      console.log(`    ♻️  [${membership.parent}] ← ${membership.member}`)
      continue
    }
    await prisma.historicalCountryMembership.create({
      data: { historicalCountryId: parentId, memberCountryId: memberId, role: membership.role },
    })
    console.log(`    ✅ [${membership.parent}] ← ${membership.member} (${membership.role})`)
    membershipCount++
  }

  console.log(`✅ 계승 관계 ${transitionCount}건, 소속 관계 ${membershipCount}건 완료\n`)
}
