import { PrismaService } from '../prisma.service'

export interface CountryData {
  name: string
  localName: string
  flagEmoji: string
  isoCode: string
  population: number
  areaSqKm: number
  continentName: string
}

const COUNTRIES: CountryData[] = [
  {
    name: '대한민국',
    localName: '대한민국',
    flagEmoji: '🇰🇷',
    isoCode: 'KR',
    population: 51780579,
    areaSqKm: 100210.0,
    continentName: '아시아',
  },
  {
    name: '일본',
    localName: '日本',
    flagEmoji: '🇯🇵',
    isoCode: 'JP',
    population: 125584838,
    areaSqKm: 377975.0,
    continentName: '아시아',
  },
  {
    name: '중국',
    localName: '中国',
    flagEmoji: '🇨🇳',
    isoCode: 'CN',
    population: 1412175000,
    areaSqKm: 9596961.0,
    continentName: '아시아',
  },
  {
    name: '미국',
    localName: 'United States',
    flagEmoji: '🇺🇸',
    isoCode: 'US',
    population: 334914895,
    areaSqKm: 9833520.0,
    continentName: '북아메리카',
  },
  {
    name: '영국',
    localName: 'United Kingdom',
    flagEmoji: '🇬🇧',
    isoCode: 'GB',
    population: 68497907,
    areaSqKm: 242495.0,
    continentName: '유럽',
  },
  {
    name: '프랑스',
    localName: 'France',
    flagEmoji: '🇫🇷',
    isoCode: 'FR',
    population: 67935660,
    areaSqKm: 643801.0,
    continentName: '유럽',
  },
  {
    name: '독일',
    localName: 'Deutschland',
    flagEmoji: '🇩🇪',
    isoCode: 'DE',
    population: 84482267,
    areaSqKm: 357592.0,
    continentName: '유럽',
  },
  {
    name: '러시아',
    localName: 'Россия',
    flagEmoji: '🇷🇺',
    isoCode: 'RU',
    population: 144444359,
    areaSqKm: 17098242.0,
    continentName: '유럽',
  },
]

export async function seedCountries(
  prisma: PrismaService,
  continentMap: Map<string, string>,
): Promise<void> {
  console.log('\n🌏 국가 시딩 시작...')

  for (const country of COUNTRIES) {
    const continentId = continentMap.get(country.continentName)
    if (!continentId) {
      console.error(`  ❌ 대륙을 찾을 수 없음: ${country.continentName}`)
      continue
    }

    const created = await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: {
        name: country.name,
        localName: country.localName,
        flagEmoji: country.flagEmoji,
        population: country.population,
        areaSqKm: country.areaSqKm,
        continentId: continentId,
      },
      create: {
        name: country.name,
        localName: country.localName,
        flagEmoji: country.flagEmoji,
        isoCode: country.isoCode,
        population: country.population,
        areaSqKm: country.areaSqKm,
        continentId: continentId,
      },
    })
    console.log(`  ✅ 국가 생성됨: ${created.name}`)
  }

  console.log(`✅ 총 ${COUNTRIES.length}개 국가 생성 완료!\n`)
}

