import { Era, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'

const GERMAN_HISTORICAL: Array<{
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
    id: 'de000001-0000-0000-0000-000000000001',
    name: '동프랑크 왕국',
    enName: 'East Francia',
    description:
      '프랑크 왕국의 동부 계승국. 베르됭 조약(843)으로 분할되어 루트비히 2세가 통치. 이후 독일 왕국·신성로마제국의 기원이 됨.',
    startEra: Era.AD,
    startYear: 843,
    endEra: Era.AD,
    endYear: 962,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000002',
    name: '신성 로마 제국',
    enName: 'Holy Roman Empire',
    description:
      '오토 1세 대관(962)부터 나폴레옹 전쟁으로 해체(1806)되기까지 존속한 중부 유럽의 봉건 제국. 독일·오스트리아·보헤미아 등을 아우름.',
    startEra: Era.AD,
    startYear: 962,
    endEra: Era.AD,
    endYear: 1806,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: 'de000001-0000-0000-0000-000000000003',
    name: '프로이센 왕국',
    enName: 'Kingdom of Prussia',
    description:
      '호엔촐레른 가문이 다스린 독일 북부의 왕국. 비스마르크의 지도 아래 독일 통일을 주도했으며 1918년 군주제 폐지까지 존속.',
    startEra: Era.AD,
    startYear: 1701,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
  },
  {
    id: 'de000001-0000-0000-0000-000000000004',
    name: '독일 연방',
    enName: 'German Confederation',
    description:
      '빈 회의(1815) 결과로 성립된 39개 독일어권 국가의 느슨한 연합체. 1866년 프로이센-오스트리아 전쟁으로 해체.',
    startEra: Era.AD,
    startYear: 1815,
    endEra: Era.AD,
    endYear: 1866,
    stateType: HistoricalStateType.CONFEDERATION,
  },
  {
    id: 'de000001-0000-0000-0000-000000000005',
    name: '북독일 연방',
    enName: 'North German Confederation',
    description:
      '프로이센 주도로 1867년 결성된 북부 독일 국가들의 연방. 독일 제국의 직접적인 전신.',
    startEra: Era.AD,
    startYear: 1867,
    endEra: Era.AD,
    endYear: 1871,
    stateType: HistoricalStateType.FEDERATION,
  },
  {
    id: 'de000001-0000-0000-0000-000000000006',
    name: '독일 제국',
    enName: 'German Empire',
    description:
      '1871년 프로이센의 빌헬름 1세가 독일 황제로 즉위하며 성립. 제1차 세계대전 패배 후 1918년 해체.',
    startEra: Era.AD,
    startYear: 1871,
    endEra: Era.AD,
    endYear: 1918,
    stateType: HistoricalStateType.EMPIRE,
  },
  {
    id: 'de000001-0000-0000-0000-000000000007',
    name: '바이마르 공화국',
    enName: 'Weimar Republic',
    description:
      '제1차 세계대전 후 독일 제국을 대체한 민주 공화국. 1933년 나치당의 집권으로 사실상 종말.',
    startEra: Era.AD,
    startYear: 1918,
    endEra: Era.AD,
    endYear: 1933,
    stateType: HistoricalStateType.REPUBLIC,
  },
  {
    id: 'de000001-0000-0000-0000-000000000008',
    name: '나치 독일',
    enName: 'Nazi Germany',
    description:
      '히틀러와 국가사회주의당이 통치한 전체주의 국가. 제2차 세계대전을 일으키고 1945년 연합국에 패배하며 붕괴.',
    startEra: Era.AD,
    startYear: 1933,
    endEra: Era.AD,
    endYear: 1945,
    stateType: HistoricalStateType.REPUBLIC,
  },
  {
    id: 'de000001-0000-0000-0000-000000000009',
    name: '서독',
    enName: 'West Germany',
    description:
      '제2차 세계대전 후 서방 점령지에서 수립된 독일 연방 공화국. 1990년 독일 재통일로 현재의 독일 연방 공화국이 됨.',
    startEra: Era.AD,
    startYear: 1949,
    endEra: Era.AD,
    endYear: 1990,
    stateType: HistoricalStateType.FEDERATION,
  },
  {
    id: 'de000001-0000-0000-0000-000000000010',
    name: '동독',
    enName: 'East Germany',
    description:
      '소련 점령지에서 수립된 독일 민주 공화국. 1989년 베를린 장벽 붕괴 후 1990년 서독에 흡수 통일.',
    startEra: Era.AD,
    startYear: 1949,
    endEra: Era.AD,
    endYear: 1990,
    stateType: HistoricalStateType.REPUBLIC,
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  for (const h of GERMAN_HISTORICAL) {
    await prisma.historicalCountry.upsert({
      where: { id: h.id },
      update: { ...h, accountId: ACCOUNT_ID },
      create: { ...h, accountId: ACCOUNT_ID },
    })
    console.log(`  ✅ ${h.name} (${h.enName})`)
  }
  console.log(`\n총 ${GERMAN_HISTORICAL.length}개 독일 관련 역사국가 등록 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
