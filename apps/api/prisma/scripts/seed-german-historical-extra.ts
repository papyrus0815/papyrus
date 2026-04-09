import { Era, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const GERMANY_ID = '679fbd36-845e-44af-b909-8fba46c7ea55'

// 기존에 등록한 10개 + 추가분 전부
const EXISTING_IDS = [
  'de000001-0000-0000-0000-000000000001', // 동프랑크 왕국
  'de000001-0000-0000-0000-000000000002', // 신성 로마 제국
  'de000001-0000-0000-0000-000000000003', // 프로이센 왕국
  'de000001-0000-0000-0000-000000000004', // 독일 연방
  'de000001-0000-0000-0000-000000000005', // 북독일 연방
  'de000001-0000-0000-0000-000000000006', // 독일 제국
  'de000001-0000-0000-0000-000000000007', // 바이마르 공화국
  'de000001-0000-0000-0000-000000000008', // 나치 독일
  'de000001-0000-0000-0000-000000000009', // 서독
  'de000001-0000-0000-0000-000000000010', // 동독
]

const EXTRA: Array<{
  id: string
  name: string
  enName: string
  description: string
  startEra: Era
  startYear: number
  endEra: Era
  endYear: number
  stateType: HistoricalStateType
}> = [
  {
    id: 'de000001-0000-0000-0000-000000000011',
    name: '프로이센 공국',
    enName: 'Duchy of Prussia',
    description:
      '1525년 튜튼 기사단국을 세속화하여 호엔촐레른 가문이 수립한 공국. 1618년 브란덴부르크와 동군연합을 이루며 브란덴부르크-프로이센으로 발전.',
    startEra: Era.AD,
    startYear: 1525,
    endEra: Era.AD,
    endYear: 1701,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: 'de000001-0000-0000-0000-000000000012',
    name: '브란덴부르크 변경백국',
    enName: 'Margraviate of Brandenburg',
    description:
      '신성로마제국 내 북동부의 변경백국. 1356년 금인칙서로 선제후 지위를 얻었고, 1415년 호엔촐레른 가문이 상속받아 이후 프로이센의 모태가 됨.',
    startEra: Era.AD,
    startYear: 1157,
    endEra: Era.AD,
    endYear: 1806,
    stateType: HistoricalStateType.MARGRAVIATE,
  },
  {
    id: 'de000001-0000-0000-0000-000000000013',
    name: '브란덴부르크-프로이센',
    enName: 'Brandenburg-Prussia',
    description:
      '브란덴부르크 선제후가 프로이센 공국과 동군연합(1618)을 이룬 호엔촐레른 가문의 영토. 1701년 프로이센 왕국으로 승격.',
    startEra: Era.AD,
    startYear: 1618,
    endEra: Era.AD,
    endYear: 1701,
    stateType: HistoricalStateType.ELECTORATE,
  },
  {
    id: 'de000001-0000-0000-0000-000000000014',
    name: '바이에른 왕국',
    enName: 'Kingdom of Bavaria',
    description:
      '비텔스바흐 가문이 다스린 남부 독일의 왕국. 1806년 나폴레옹의 후원으로 왕국 승격, 1918년 독일 11월 혁명으로 소멸.',
    startEra: Era.AD,
    startYear: 1806,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000015',
    name: '바이에른 공국',
    enName: 'Duchy of Bavaria',
    description:
      '중세 독일의 대표적인 대공국 중 하나. 907년 형성, 이후 비텔스바흐 가문의 통치 아래 선제후국(1623)과 왕국(1806)으로 발전.',
    startEra: Era.AD,
    startYear: 907,
    endEra: Era.AD,
    endYear: 1623,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: 'de000001-0000-0000-0000-000000000016',
    name: '작센 왕국',
    enName: 'Kingdom of Saxony',
    description:
      '1806년 나폴레옹의 후원으로 작센 선제후국에서 승격된 왕국. 베틴 가문이 통치했으며 1918년 독일 혁명으로 종식.',
    startEra: Era.AD,
    startYear: 1806,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000017',
    name: '작센 선제후국',
    enName: 'Electorate of Saxony',
    description:
      '신성로마제국의 7대 선제후 중 하나. 베틴 가문이 1423년부터 1806년까지 통치하며 중부 독일의 중심 세력이었음.',
    startEra: Era.AD,
    startYear: 1356,
    endEra: Era.AD,
    endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
  },
  {
    id: 'de000001-0000-0000-0000-000000000018',
    name: '하노버 왕국',
    enName: 'Kingdom of Hanover',
    description:
      '빈 회의(1815) 결과로 하노버 선제후국을 승격시켜 수립된 왕국. 영국 왕과 동군연합을 이루다 1866년 프로이센에 병합됨.',
    startEra: Era.AD,
    startYear: 1814,
    endEra: Era.AD,
    endYear: 1866,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000019',
    name: '뷔르템베르크 왕국',
    enName: 'Kingdom of Württemberg',
    description:
      '나폴레옹 전쟁기에 왕국으로 승격된 남서부 독일의 국가. 뷔르템베르크 가문이 통치했으며 1918년 독일 혁명으로 종식.',
    startEra: Era.AD,
    startYear: 1806,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000020',
    name: '바덴 대공국',
    enName: 'Grand Duchy of Baden',
    description:
      '1806년 나폴레옹의 재편으로 수립된 남서부 독일의 대공국. 1871년 독일 제국 가맹국이 되었으며 1918년 혁명으로 폐지.',
    startEra: Era.AD,
    startYear: 1806,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: 'de000001-0000-0000-0000-000000000021',
    name: '헤센 대공국',
    enName: 'Grand Duchy of Hesse',
    description:
      '1806년 헤센-다름슈타트 방백령을 승격하여 성립된 대공국. 1871년 독일 제국의 일원이 되었고 1918년 혁명으로 폐지.',
    startEra: Era.AD,
    startYear: 1806,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
  },
  {
    id: 'de000001-0000-0000-0000-000000000022',
    name: '튜튼 기사단국',
    enName: 'State of the Teutonic Order',
    description:
      '13세기 발트해 연안에서 튜튼 기사단이 세운 기사수도회 국가. 1525년 세속화되어 프로이센 공국이 됨. 이후 프로이센의 직접적인 전신.',
    startEra: Era.AD,
    startYear: 1226,
    endEra: Era.AD,
    endYear: 1525,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000023',
    name: '라인 동맹',
    enName: 'Confederation of the Rhine',
    description:
      '나폴레옹이 1806년 신성로마제국 해체와 함께 설립한 독일 제후국들의 연합. 1813년 라이프치히 전투 후 해체.',
    startEra: Era.AD,
    startYear: 1806,
    endEra: Era.AD,
    endYear: 1813,
    stateType: HistoricalStateType.CONFEDERATION,
  },
  {
    id: 'de000001-0000-0000-0000-000000000024',
    name: '동독 (소련 점령지)',
    enName: 'Soviet Occupation Zone of Germany',
    description:
      '2차 대전 후 소련이 점령한 독일 동부 지역. 1949년 독일 민주 공화국(동독) 수립 전까지 존속.',
    startEra: Era.AD,
    startYear: 1945,
    endEra: Era.AD,
    endYear: 1949,
    stateType: HistoricalStateType.FEDERATION,
  },
  {
    id: 'de000001-0000-0000-0000-000000000025',
    name: '연합군 점령 독일',
    enName: 'Allied-occupied Germany',
    description:
      '2차 대전 패전 후 미·영·프·소 4국이 분할 점령한 독일. 1949년 서독·동독 건국까지 존속.',
    startEra: Era.AD,
    startYear: 1945,
    endEra: Era.AD,
    endYear: 1949,
    stateType: HistoricalStateType.FEDERATION,
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  // 1) 추가 역사국가 upsert
  for (const h of EXTRA) {
    await prisma.historicalCountry.upsert({
      where: { id: h.id },
      update: { ...h, accountId: ACCOUNT_ID },
      create: { ...h, accountId: ACCOUNT_ID },
    })
    console.log(`  ✅ ${h.name} (${h.enName})`)
  }

  // 2) 전체 독일 관련 역사국가를 현대 독일과 연결
  const allIds = [...EXISTING_IDS, ...EXTRA.map((e) => e.id)]
  let linked = 0
  for (const historicalCountryId of allIds) {
    const existing = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId, modernCountryId: GERMANY_ID },
    })
    if (!existing) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId, modernCountryId: GERMANY_ID },
      })
      linked += 1
    }
  }
  console.log(
    `\n총 ${EXTRA.length}개 추가 등록, 현대 독일과 ${linked}개 신규 연결 (전체 ${allIds.length}개)`,
  )
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
