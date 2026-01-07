import { PrismaService } from '../prisma.service'

export interface ContinentData {
  name: string
  enName: string
  isoCode: string
  parentId: string | null
}

const CONTINENTS: ContinentData[] = [
  { name: '아시아', enName: 'Asia', isoCode: 'AS', parentId: null },
  { name: '유럽', enName: 'Europe', isoCode: 'EU', parentId: null },
  { name: '아프리카', enName: 'Africa', isoCode: 'AF', parentId: null },
  {
    name: '북아메리카',
    enName: 'North America',
    isoCode: 'NA',
    parentId: null,
  },
  {
    name: '남아메리카',
    enName: 'South America',
    isoCode: 'SA',
    parentId: null,
  },
  {
    name: '오세아니아',
    enName: 'Oceania',
    isoCode: 'OC',
    parentId: null,
  },
  { name: '남극', enName: 'Antarctica', isoCode: 'AN', parentId: null },
]

export async function seedContinents(
  prisma: PrismaService,
): Promise<Map<string, string>> {
  console.log('\n🌍 대륙 시딩 시작...')

  const continentMap = new Map<string, string>()

  for (const continent of CONTINENTS) {
    const created = await prisma.continent.upsert({
      where: { name: continent.name },
      update: continent,
      create: continent,
    })
    continentMap.set(continent.name, created.id)
    console.log(`  ✅ 대륙 생성됨: ${created.name}`)
  }

  console.log(`✅ 총 ${CONTINENTS.length}개 대륙 생성 완료!\n`)

  return continentMap
}
