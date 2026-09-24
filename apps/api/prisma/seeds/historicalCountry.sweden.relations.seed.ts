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
  // 칼마르 동맹 이탈 (1523 구스타브 바사 국왕 선출) — 덴마크-노르웨이가 잔존한 것과 대칭
  { predecessor: '칼마르 동맹', successor: '스웨덴 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 대국 시대 진입·종료 (1611 구스타브 2세 아돌프 즉위 / 1721 니스타드 조약) —
  // 같은 왕국의 한 시대라 REGIME_CHANGE 왕복 한 쌍으로 둔다(잉글랜드 왕국↔연방 전례)
  { predecessor: '스웨덴 왕국', successor: '스웨덴 제국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  { predecessor: '스웨덴 제국', successor: '스웨덴 왕국', eventType: TransitionEventType.SUCCESSION, transitionScope: TransitionScope.REGIME_CHANGE },
  // 대북방전쟁 패전 → 발트 속령 러시아 이양 (1710 항복, 1721 니스타드 조약)
  { predecessor: '스웨덴령 에스토니아', successor: '러시아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '스웨덴령 리보니아', successor: '러시아 제국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 핀란드 전쟁 패전 → 동쪽 절반 분리 (1809 프레드릭스함 조약). 스웨덴 왕국은 존속하므로 SPLIT
  { predecessor: '스웨덴 왕국', successor: '핀란드 대공국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 빈 회의 (1815) — 대륙의 마지막 발판을 프로이센에 양도
  { predecessor: '스웨덴령 포메라니아', successor: '프로이센 왕국', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 신스웨덴 → 뉴네덜란드 원정 항복 (1655). 뉴네덜란드 행이 없어 본국 네덜란드 공화국으로 잇는다
  { predecessor: '신스웨덴', successor: '네덜란드 공화국', eventType: TransitionEventType.CONQUEST, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1814 킬 조약 → 노르웨이가 덴마크에서 스웨덴으로. 두 전신이 같은 연합으로 수렴
  { predecessor: '덴마크-노르웨이', successor: '스웨덴-노르웨이 연합', eventType: TransitionEventType.TREATY, transitionScope: TransitionScope.STATE_SUCCESSION },
  { predecessor: '노르웨이 왕국', successor: '스웨덴-노르웨이 연합', eventType: TransitionEventType.UNION, transitionScope: TransitionScope.STATE_SUCCESSION },
  // 1905 연합 해체 — 스웨덴 왕국 존속(덴마크-노르웨이 → 덴마크 왕국과 같은 모양).
  // 노르웨이 측 후신(1905~ 노르웨이 왕국) 행은 현대 NO 등록과 함께 별도 배치 대상
  { predecessor: '스웨덴-노르웨이 연합', successor: '스웨덴 왕국', eventType: TransitionEventType.SPLIT, transitionScope: TransitionScope.STATE_SUCCESSION },
]

// ── 소속 관계 정의 ────────────────────────────────────────────────────────────
// { parent, member, role, isLeadingMember }
const MEMBERSHIPS: {
  parent: string
  member: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
}[] = [
  // 칼마르 동맹의 세 번째 축 — denmark 시드가 "별도 지역 시드 대상"이라며 남겨둔 행
  { parent: '칼마르 동맹', member: '스웨덴 왕국', role: HistoricalMembershipRole.UNION },
  // 스웨덴-노르웨이 연합 구성 (1814~1905) — 외교권을 쥔 스웨덴이 주축
  { parent: '스웨덴-노르웨이 연합', member: '스웨덴 왕국', role: HistoricalMembershipRole.UNION, isLeadingMember: true },
  { parent: '스웨덴-노르웨이 연합', member: '노르웨이 왕국', role: HistoricalMembershipRole.UNION },
  // 발트해 건너편 왕관령 — 자체 군주 없이 스웨덴 국왕 아래 자치를 누린 속령이라 DOMINION
  { parent: '스웨덴 왕국', member: '스웨덴령 에스토니아', role: HistoricalMembershipRole.DOMINION },
  { parent: '스웨덴 왕국', member: '스웨덴령 리보니아', role: HistoricalMembershipRole.DOMINION },
  { parent: '스웨덴 왕국', member: '스웨덴령 포메라니아', role: HistoricalMembershipRole.DOMINION },
  // 포메라니아 덕에 스웨덴 국왕이 제국 제후로 제국의회에 자리를 얻었다(홀슈타인 공국 전례)
  { parent: '신성로마제국', member: '스웨덴령 포메라니아', role: HistoricalMembershipRole.CONFEDERATION_MEMBER },
  // 신대륙 식민지
  { parent: '스웨덴 왕국', member: '신스웨덴', role: HistoricalMembershipRole.COLONY },
  // 러시아 황제가 핀란드 대공을 겸한 자치 대공국 (1809~1917)
  { parent: '러시아 제국', member: '핀란드 대공국', role: HistoricalMembershipRole.DOMINION },
]

// ── 수평 관계(동군연합) 정의 ──────────────────────────────────────────────────
const RELATIONS: {
  subject: string
  object: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}[] = [
  // 1814-11-04 노르웨이 스토르팅이 칼 13세를 국왕으로 선출 ~ 1905-10-26 카를스타드 협약 승인
  { subject: '스웨덴 왕국', object: '노르웨이 왕국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1814-11-04', endDate: '1905-10-26' },
  // 1809-09-17 프레드릭스함 조약 ~ 1917-12-06 핀란드 독립 선언: 러시아 황제가 핀란드 대공을 겸함
  { subject: '러시아 제국', object: '핀란드 대공국', relationType: HistoricalRelationType.PERSONAL_UNION, startDate: '1809-09-17', endDate: '1917-12-06' },
]

export async function seedSwedenHistoricalCountryRelations(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🔗 스웨덴 역사 국가 계승·소속 관계 시딩 시작...')

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
          isLeadingMember: membership.isLeadingMember ?? false,
        },
      })
      console.log(`    ✅ [${membership.parent}] ← ${membership.member}${membership.isLeadingMember ? ' (주축)' : ''}`)
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
          startDate: relation.startDate ? new Date(relation.startDate) : undefined,
          endDate: relation.endDate ? new Date(relation.endDate) : undefined,
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
