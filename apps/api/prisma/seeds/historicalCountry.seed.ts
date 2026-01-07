import { Era, HistoricalStateType } from '../generated/client'
import { PrismaService } from '../prisma.service'

export interface HistoricalCountryData {
  id: string
  name: string
  enName: string
  description: string
  startEra: Era
  startYear: number
  endEra: Era
  endYear: number
  stateType: HistoricalStateType
}

const HISTORICAL_COUNTRIES: HistoricalCountryData[] = [
  {
    id: 'hist-country-gojoseon',
    name: '고조선',
    enName: 'Gojoseon',
    description: '한국 역사상 최초의 국가. 단군왕검이 건국했다고 전해진다.',
    startEra: Era.BC,
    startYear: 2333,
    endEra: Era.BC,
    endYear: 108,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'hist-country-goguryeo',
    name: '고구려',
    enName: 'Goguryeo',
    description:
      '한국 고대 삼국 중 하나. 광개토대왕, 장수왕 등 강력한 군주가 등장.',
    startEra: Era.BC,
    startYear: 37,
    endEra: Era.AD,
    endYear: 668,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'hist-country-baekje',
    name: '백제',
    enName: 'Baekje',
    description: '한국 고대 삼국 중 하나. 일본과 활발한 교류.',
    startEra: Era.BC,
    startYear: 18,
    endEra: Era.AD,
    endYear: 660,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'hist-country-silla',
    name: '신라',
    enName: 'Silla',
    description: '한국 고대 삼국 중 하나. 삼국을 통일하고 천년 왕국을 건설.',
    startEra: Era.BC,
    startYear: 57,
    endEra: Era.AD,
    endYear: 935,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'hist-country-goryeo',
    name: '고려',
    enName: 'Goryeo',
    description: '한국의 중세 왕조. Korea의 어원. 팔만대장경 제작.',
    startEra: Era.AD,
    startYear: 918,
    endEra: Era.AD,
    endYear: 1392,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'hist-country-joseon',
    name: '조선',
    enName: 'Joseon',
    description:
      '한국의 마지막 왕조. 500년 이상 존속. 한글 창제, 성리학 발전.',
    startEra: Era.AD,
    startYear: 1392,
    endEra: Era.AD,
    endYear: 1897,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'hist-country-roman-empire',
    name: '로마 제국',
    enName: 'Roman Empire',
    description: '고대 지중해 세계를 지배한 제국. 서양 문명의 기초.',
    startEra: Era.BC,
    startYear: 27,
    endEra: Era.AD,
    endYear: 476,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: 'hist-country-mongol-empire',
    name: '몽골 제국',
    enName: 'Mongol Empire',
    description: '징기스칸이 건국한 세계 최대 영토의 제국.',
    startEra: Era.AD,
    startYear: 1206,
    endEra: Era.AD,
    endYear: 1368,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: 'hist-country-ottoman-empire',
    name: '오스만 제국',
    enName: 'Ottoman Empire',
    description: '동유럽과 중동을 지배한 이슬람 제국. 600년 이상 존속.',
    startEra: Era.AD,
    startYear: 1299,
    endEra: Era.AD,
    endYear: 1922,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: 'hist-country-british-empire',
    name: '대영 제국',
    enName: 'British Empire',
    description: '해가 지지 않는 제국. 세계 최대 식민지 보유.',
    startEra: Era.AD,
    startYear: 1583,
    endEra: Era.AD,
    endYear: 1997,
    stateType: HistoricalStateType.EMPIRE,
  },
]

export async function seedHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏛️ 역사적 국가 시딩 시작...')

  for (const historicalCountry of HISTORICAL_COUNTRIES) {
    const created = await prisma.historicalCountry.upsert({
      where: { id: historicalCountry.id },
      update: {
        name: historicalCountry.name,
        enName: historicalCountry.enName,
        description: historicalCountry.description,
        startEra: historicalCountry.startEra,
        startYear: historicalCountry.startYear,
        endEra: historicalCountry.endEra,
        endYear: historicalCountry.endYear,
        stateType: historicalCountry.stateType,
      },
      create: historicalCountry,
    })
    console.log(`  ✅ 역사적 국가 생성됨: ${created.name}`)
  }

  console.log(`✅ 총 ${HISTORICAL_COUNTRIES.length}개 역사적 국가 생성 완료!\n`)
}

