/**
 * 역사국가에만 소속된 인물의 이름 표시 순서 백필.
 *
 * 표시 순서는 개인값(person.nameDisplayOrder) → 현대 국가(person.country) 기본값 → 동양식 순으로 정해진다.
 * 현대 국가 없이 역사국가에만 걸린 인물은 둘째 칸이 비어 모든 화면에서 성-우선으로 떨어졌다
 * (영국 연합왕국 총리 '에스퀴스 허버트 헨리'·이탈리아 왕국 '바돌리오 피에트로' 등).
 * 저장 경로(PersonService.deriveNameDisplayOrderForHistoricalOnly)와 같은 규칙으로 기존 행을 채운다:
 * 역사국가에 연결된 현대 국가들의 기본값이 하나로 모일 때만 그 값을 개인값으로 굳힌다.
 *
 * 멱등 — 개인값이 이미 있는 행은 건드리지 않으므로 다시 돌려도 바뀌는 행이 없다.
 */
import type { PrismaClient } from '@prisma/client'

/** 성·이름 칸이 뒤바뀌어 저장된 인물 — 순서만 채우면 더 틀어지므로 칸을 바로잡고 순서를 명시한다 */
const SWAPPED_NAME_FIXES: Array<{
  storedSurname: string
  storedName: string
  historicalCountryName: string
  nameDisplayOrder: 'korean' | 'western'
}> = [
  /* 베케를레 샨도르(Wekerle Sándor) — 헝가리 총리, 헝가리식은 성-우선 */
  { storedSurname: '샨도르', storedName: '베케를레', historicalCountryName: '헝가리 왕국', nameDisplayOrder: 'korean' },
]

export async function backfillPersonNameOrder(prisma: PrismaClient): Promise<void> {
  let fixedSwaps = 0
  for (const fix of SWAPPED_NAME_FIXES) {
    const result = await prisma.person.updateMany({
      where: {
        surname: fix.storedSurname,
        name: fix.storedName,
        historicalCountry: { name: fix.historicalCountryName },
      },
      data: { surname: fix.storedName, name: fix.storedSurname, nameDisplayOrder: fix.nameDisplayOrder },
    })
    fixedSwaps += result.count
  }

  const candidates = await prisma.person.findMany({
    where: { countryId: null, nameDisplayOrder: null, historicalCountryId: { not: null } },
    select: {
      id: true,
      historicalCountry: {
        select: {
          name: true,
          modernConnections: { select: { modernCountry: { select: { defaultNameDisplayOrder: true } } } },
        },
      },
    },
  })

  const updatedByOrder: Record<'korean' | 'western', number> = { korean: 0, western: 0 }
  const skipped = new Map<string, number>()
  for (const candidate of candidates) {
    const orders = new Set(
      (candidate.historicalCountry?.modernConnections ?? []).map((link) => link.modernCountry.defaultNameDisplayOrder),
    )
    const [onlyOrder] = [...orders]
    if (orders.size !== 1 || (onlyOrder !== 'korean' && onlyOrder !== 'western')) {
      const key = candidate.historicalCountry?.name ?? '(역사국가 없음)'
      skipped.set(key, (skipped.get(key) ?? 0) + 1)
      continue
    }
    await prisma.person.update({ where: { id: candidate.id }, data: { nameDisplayOrder: onlyOrder } })
    updatedByOrder[onlyOrder] += 1
  }

  console.log(
    `[person-name-order] 성·이름 칸 교정 ${fixedSwaps}명 · 순서 채움 western ${updatedByOrder.western}명, korean ${updatedByOrder.korean}명`,
  )
  if (skipped.size > 0) {
    console.log(
      `[person-name-order] 현대 국가 기본값이 하나로 모이지 않아 건너뜀: ${[...skipped].map(([name, count]) => `${name} ${count}`).join(', ')}`,
    )
  }
}
