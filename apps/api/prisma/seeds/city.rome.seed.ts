/**
 * 로마 — 도시 목록에 이탈리아 수도가 없어 당사(팔라초 브라스키)·인물 출생지가 주소 글로만 남던 것을 잇는다.
 * 도시는 쓰기 API가 없어 시드로만 들어간다. (countryId, name)으로 멱등.
 */
import type { PrismaClient } from '@prisma/client'

const ITALY_COUNTRY_NAME = '이탈리아'

export async function seedCityRome(prisma: PrismaClient): Promise<string | null> {
  const italy = await prisma.country.findFirst({ where: { name: ITALY_COUNTRY_NAME }, select: { id: true } })
  if (!italy) {
    console.warn(`  ⚠️  국가 '${ITALY_COUNTRY_NAME}' 미존재 — 시딩 중단`)
    return null
  }
  const found = await prisma.city.findFirst({ where: { countryId: italy.id, name: '로마' }, select: { id: true } })
  if (found) {
    console.log('  ⏭️  도시 로마 (이미 존재)')
    return found.id
  }
  const created = await prisma.city.create({
    data: {
      name: '로마',
      localName: 'Roma',
      countryId: italy.id,
      latitude: 41.8931,
      longitude: 12.4828,
    },
    select: { id: true },
  })
  console.log('  ✅ 도시 생성: 로마')
  return created.id
}
