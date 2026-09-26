import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * '건국/멸망' 카테고리 신설에 따른 기존 사건 재분류 + 국가 배역(FOUNDED/DISSOLVED) 백필.
 *
 * 대상은 제목이 곧 한 나라의 성립·소멸인 사건만이다. 제목 키워드('독립'·'병합'·'붕괴')만으로는
 * 고르지 않았다 — '각 성 독립 선언'(1911)·'보스니아 병합 위기'·'아사드 정권 붕괴'처럼
 * 국가의 성립·소멸이 아닌 사건이 섞이기 때문이다.
 *
 * 배역은 기존 행의 role을 **교체**한다(주도국→건국, 피해국→멸망). 건국·멸망이 더 구체적인
 * 같은 사실이라 정보 손실이 아니고, 행을 하나 더 두면 같은 나라가 참여국 목록에 두 번 선다.
 * 행이 없으면 새로 만든다(sortOrder는 맨 뒤).
 *
 * 멱등: 이미 목표 카테고리·배역이면 건드리지 않는다. 사건·국가가 없으면 warn 후 건너뛴다.
 */

const CATEGORY_NAME = '건국/멸망'

interface StatehoodLink {
  /** 역사국가명 — countryName과 배타 */
  historicalCountryName?: string
  /** 현대국가명 */
  countryName?: string
  role: typeof EventCountryRole.FOUNDED | typeof EventCountryRole.DISSOLVED
}

interface StatehoodBackfill {
  /** 사건 제목(정확 일치) */
  title: string
  links: StatehoodLink[]
}

const BACKFILL: StatehoodBackfill[] = [
  {
    title: '아바르 칸국 건국',
    links: [{ historicalCountryName: '아바르 칸국', role: EventCountryRole.FOUNDED }],
  },
  {
    title: '랑고바르드 왕국의 프랑크 왕국 병합',
    links: [{ historicalCountryName: '랑고바르드 왕국', role: EventCountryRole.DISSOLVED }],
  },
  {
    title: '아바르 칸국 멸망',
    links: [{ historicalCountryName: '아바르 칸국', role: EventCountryRole.DISSOLVED }],
  },
  {
    title: '대모라비아 왕국 건국',
    links: [{ historicalCountryName: '대모라비아 왕국', role: EventCountryRole.FOUNDED }],
  },
  {
    title: '보헤미아 공작령 선언 (프르셰미슬 왕조 보헤미아 공국 성립)',
    links: [{ historicalCountryName: '보헤미아 공국', role: EventCountryRole.FOUNDED }],
  },
  {
    title: '대모라비아 왕국 멸망',
    links: [{ historicalCountryName: '대모라비아 왕국', role: EventCountryRole.DISSOLVED }],
  },
  {
    title: '에도 막부 수립',
    links: [{ historicalCountryName: '도쿠가와 막부', role: EventCountryRole.FOUNDED }],
  },
  {
    title: '청나라 건국',
    links: [{ historicalCountryName: '청나라', role: EventCountryRole.FOUNDED }],
  },
  // 명나라는 역사국가 행이 없어 카테고리만 옮긴다
  { title: '명나라 멸망', links: [] },
  {
    title: '미국 독립선언서',
    links: [{ countryName: '미국', role: EventCountryRole.FOUNDED }],
  },
  {
    // 공국(1878~1908)이 독립 선언으로 왕국(차르국, 1908~1946)이 됐다 — 한 사건의 양 끝
    title: '불가리아 독립 선언',
    links: [
      { historicalCountryName: '불가리아 왕국', role: EventCountryRole.FOUNDED },
      { historicalCountryName: '불가리아 공국', role: EventCountryRole.DISSOLVED },
    ],
  },
  {
    title: '알바니아 공국 수립(빌헬름 왕위 수락)',
    links: [{ historicalCountryName: '알바니아 공국', role: EventCountryRole.FOUNDED }],
  },
  {
    title: '중화인민공화국 수립',
    links: [{ countryName: '중국', role: EventCountryRole.FOUNDED }],
  },
]

export async function seedEventStatehoodBackfill(prisma: PrismaService): Promise<void> {
  console.log('\n🏛️  건국/멸망 사건 재분류·배역 백필 시작...')

  const category = await prisma.eventCategory.findFirst({
    where: { name: CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 미존재: ${CATEGORY_NAME} (eventCategory.seed 먼저)`)
    return
  }

  for (const item of BACKFILL) {
    const events = await prisma.event.findMany({
      where: { title: item.title, deletedAt: null },
      select: { id: true, categoryId: true },
    })
    if (events.length === 0) {
      console.warn(`  ⚠️  사건 미존재: ${item.title}`)
      continue
    }

    for (const event of events) {
      if (event.categoryId !== category.id) {
        await prisma.event.update({
          where: { id: event.id },
          data: { categoryId: category.id },
        })
        console.log(`  ✅ 재분류: ${item.title}`)
      } else {
        console.log(`  ⏭️  이미 분류됨: ${item.title}`)
      }

      for (const link of item.links) {
        const label = link.historicalCountryName ?? link.countryName
        let historicalCountryId: string | null = null
        let countryId: string | null = null
        if (link.historicalCountryName) {
          const hc = await prisma.historicalCountry.findFirst({
            where: { name: link.historicalCountryName },
            select: { id: true },
          })
          if (!hc) {
            console.warn(`    ⚠️  역사국가 미존재: ${label}`)
            continue
          }
          historicalCountryId = hc.id
        } else if (link.countryName) {
          const country = await prisma.country.findFirst({
            where: { name: link.countryName },
            select: { id: true },
          })
          if (!country) {
            console.warn(`    ⚠️  현대국가 미존재: ${label}`)
            continue
          }
          countryId = country.id
        }

        const existing = await prisma.eventCountryRelation.findFirst({
          where: { eventId: event.id, historicalCountryId, countryId },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, role: true },
        })
        if (existing?.role === link.role) {
          console.log(`    ⏭️  ${label} (${link.role})`)
          continue
        }
        if (existing) {
          await prisma.eventCountryRelation.update({
            where: { id: existing.id },
            data: { role: link.role },
          })
          console.log(`    ✅ ${label}: ${existing.role} → ${link.role}`)
          continue
        }
        const last = await prisma.eventCountryRelation.findFirst({
          where: { eventId: event.id },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true },
        })
        await prisma.eventCountryRelation.create({
          data: {
            eventId: event.id,
            historicalCountryId,
            countryId,
            role: link.role,
            sortOrder: (last?.sortOrder ?? -1) + 1,
          },
        })
        console.log(`    ✅ ${label} (${link.role}) 신규`)
      }
    }
  }

  console.log('✅ 건국/멸망 백필 완료\n')
}
