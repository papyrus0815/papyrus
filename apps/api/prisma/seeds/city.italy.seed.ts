/**
 * 이탈리아 도시 — 도시 목록에 없어 당사(국가 파시스트당 팔라초 브라스키·공화 파시스트당 산세폴크로 광장)와
 * 인물 출생지가 주소 글로만 남던 것을 잇는다. 도시는 쓰기 API가 없어 시드로만 들어간다. (countryId, name)으로 멱등.
 */
import type { PrismaClient } from '@prisma/client'

const ITALY_COUNTRY_NAME = '이탈리아'

const CITIES = [
  { name: '로마', localName: 'Roma', latitude: 41.8931, longitude: 12.4828 },
  { name: '밀라노', localName: 'Milano', latitude: 45.4642, longitude: 9.19 },
]

export async function seedItalyCities(prisma: PrismaClient): Promise<Record<string, string>> {
  const ids: Record<string, string> = {}
  const italy = await prisma.country.findFirst({ where: { name: ITALY_COUNTRY_NAME }, select: { id: true } })
  if (!italy) {
    console.warn(`  ⚠️  국가 '${ITALY_COUNTRY_NAME}' 미존재 — 시딩 중단`)
    return ids
  }
  for (const city of CITIES) {
    const found = await prisma.city.findFirst({ where: { countryId: italy.id, name: city.name }, select: { id: true } })
    if (found) {
      console.log(`  ⏭️  도시 ${city.name} (이미 존재)`)
      ids[city.name] = found.id
      continue
    }
    const created = await prisma.city.create({ data: { ...city, countryId: italy.id }, select: { id: true } })
    console.log(`  ✅ 도시 생성: ${city.name}`)
    ids[city.name] = created.id
  }
  return ids
}
