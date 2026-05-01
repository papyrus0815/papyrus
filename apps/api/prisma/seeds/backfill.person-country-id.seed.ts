/**
 * Person.countryId 백필 시드
 *
 * 목적: 어드민 인물 인포그래픽(은하계 등) 일부 뷰가 Person.country(현대 Country FK)에
 *      의존해 대륙 분류·이름 표시를 한다. 새 데이터는 PersonCountryAffiliation(역사국가 또는 현대국가)만
 *      등록되는 경우가 많아 Person.countryId가 NULL → 대륙 "기타"로 잘못 떨어진다.
 *
 *  이 시드는 Person.countryId가 NULL인 모든 인물에 대해
 *    1) PersonCountryAffiliation.country (직접 연결된 모던 국가) → 우선
 *    2) PersonCountryAffiliation.historicalCountry → modernConnections[0].modernCountry → 폴백
 *  순으로 추론해 채워준다.
 *
 *  멱등성: 이미 countryId가 채워진 인물은 건드리지 않는다.
 */
import { PrismaService } from '../prisma.service'

export async function seedBackfillPersonCountryId(prisma: PrismaService): Promise<void> {
  console.log('\n🧭 Person.countryId 백필 시작...')

  const targets = await prisma.person.findMany({
    where: { countryId: null },
    select: {
      id: true,
      originalName: true,
      name: true,
      countryAffiliations: {
        select: {
          countryId: true,
          historicalCountryId: true,
          priority: true,
          historicalCountry: {
            select: {
              modernConnections: {
                take: 1,
                select: { modernCountryId: true },
              },
            },
          },
        },
        orderBy: { priority: 'asc' },
      },
    },
  })

  let filled = 0
  let unresolved = 0

  for (const p of targets) {
    let targetCountryId: string | null = null

    // 1) affiliation에 직접 연결된 모던 국가 우선
    for (const aff of p.countryAffiliations) {
      if (aff.countryId) { targetCountryId = aff.countryId; break }
    }
    // 2) HC → 모던 링크
    if (!targetCountryId) {
      for (const aff of p.countryAffiliations) {
        const linked = aff.historicalCountry?.modernConnections?.[0]?.modernCountryId
        if (linked) { targetCountryId = linked; break }
      }
    }

    if (!targetCountryId) {
      unresolved++
      continue
    }

    await prisma.person.update({
      where: { id: p.id },
      data: { countryId: targetCountryId },
    })
    filled++
  }

  console.log(`  ✅ 채움: ${filled}건 / 추론 실패: ${unresolved}건 / 대상 총: ${targets.length}건`)
  console.log('🧭 Person.countryId 백필 완료\n')
}
