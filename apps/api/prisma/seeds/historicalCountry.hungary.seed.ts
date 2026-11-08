import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

/**
 * 헝가리 — 1918년 이후 역사 국가.
 *
 * '헝가리 왕국'(1000~1918)은 인물 시드(헝가리·보헤미아 합스부르크)가 만들고, 이 파일은 그 뒤를 잇는다.
 * 1918년 이후가 통째로 비어 있어 전간기·냉전기 헝가리 인물의 재임·재위를 걸 정체가 없었다(2026-11-07).
 *
 * 단순화 — 1919년 8월~1920년 3월 과도정부(프리드리히·후서르)는 섭정기 왕국 설명에 넣었다(별도 행 없음).
 * 1944년 10월~1945년 3월 화살십자당 살러시 정권은 '헝가리 국민통합정부'(REGIME)로 따로 둔다 —
 * 크로아티아 독립국처럼 나치 독일 PROTECTORATE 소속.
 * 현재의 헝가리는 루마니아 공화국(1989~) 전례대로 종료 없는 '헝가리 제3공화국'으로 둔다.
 */
interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  startEra?: 'BC' | 'AD'
  startYear?: number
  startMonth?: number
  endEra?: 'BC' | 'AD'
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const BUDAPEST = { latitude: 47.5, longitude: 19.04 }

const ENTRIES: HistoricalCountryEntry[] = [
  {
    name: '헝가리 민주 공화국',
    enName: 'First Hungarian Republic',
    nameOrigin:
      '헝가리어 국호는 Magyar Népköztársaság(헝가리 인민 공화국)로, 1949~1989년의 공산 국가와 이름이 같아 ' +
      '구별을 위해 "헝가리 민주 공화국" 또는 "헝가리 제1공화국"으로 부른다.',
    description:
      '1918년 10월 31일 부다페스트의 국화 혁명(애스터 혁명)으로 카로이 미하이가 정권을 잡고, ' +
      '11월 16일 오스트리아-헝가리 이중 제국에서 벗어나 공화국을 선포했다. 카로이는 임시 대통령이 되었다. ' +
      '패전 처리와 토지 개혁을 추진했으나 체코슬로바키아·루마니아·세르브-크로아트-슬로베네 왕국 군대가 국경 안으로 진주했고, ' +
      '1919년 3월 협상국이 더 넓은 중립지대를 요구한 빅스 각서를 받아들이지 못한 카로이가 물러나며 ' +
      '3월 21일 사회민주당·공산당 연합에 권력이 넘어가 소멸했다.',
    startEra: 'AD', startYear: 1918, startMonth: 11,
    endEra: 'AD', endYear: 1919, endMonth: 3,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
  {
    name: '헝가리 소비에트 공화국',
    enName: 'Hungarian Soviet Republic',
    description:
      '1919년 3월 21일 쿤 벨러가 이끈 공산·사민 연합이 세운 평의회(소비에트) 공화국으로, 러시아 바깥에서 처음 들어선 공산 정권이다. ' +
      '산업·토지 국유화와 "적색 테러"를 시행했고, 붉은 군대를 꾸려 북부 고지대(오늘날 슬로바키아)로 진격해 ' +
      '6월 슬로바키아 소비에트 공화국을 세우기도 했다. 루마니아군이 티서강을 넘어 반격하자 8월 1일 정권이 무너졌고 ' +
      '쿤은 오스트리아로 망명했다. 존속 기간은 133일이다.',
    startEra: 'AD', startYear: 1919, startMonth: 3,
    endEra: 'AD', endYear: 1919, endMonth: 8,
    stateType: HistoricalStateType.REPUBLIC,
    // 133일 단명 정권 — 잉글랜드 연방·비시 프랑스와 같은 REGIME
    entityKind: HistoricalEntityKind.REGIME,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
  {
    name: '헝가리 왕국 (섭정기)',
    enName: 'Kingdom of Hungary (1920–1946)',
    nameOrigin:
      '국호는 헝가리 왕국(Magyar Királyság)이지만 국왕 없이 섭정이 다스린 "왕 없는 왕국"이라 ' +
      '1000~1918년의 헝가리 왕국과 구별해 섭정기(호르티 시대)로 부른다.',
    description:
      '1919년 8월 소비에트 공화국이 무너진 뒤 루마니아군의 부다페스트 점령과 과도정부(프리드리히·후서르 내각)를 거쳐, ' +
      '1920년 3월 1일 국회가 왕정을 복원하고 호르티 미클로시 제독을 섭정으로 선출하며 성립했다. ' +
      '마지막 국왕 카로이 4세(오스트리아 황제 카를 1세)가 1921년 두 차례 복위를 시도했으나 호르티와 협상국의 반대로 실패했고, ' +
      '왕좌는 끝내 비어 있었다. 1920년 6월 트리아농 조약으로 옛 왕국 영토의 약 3분의 2와 인구의 절반 이상을 잃어 ' +
      '영토 회복(수정주의)이 국시가 되었다. 1938~1941년 빈 중재·유고 침공 참여로 일부 영토를 되찾고 추축국에 가담해 ' +
      '1941년 소련 침공에 참전했다. 1944년 3월 독일군이 점령했고, 10월 호르티가 휴전을 시도하자 독일이 그를 끌어내리고 ' +
      '화살십자당의 살러시 페렌츠를 "국민 지도자"로 세웠다(→ 헝가리 국민통합정부). 1945년 4월 소련군이 전 국토를 점령했고, ' +
      '1946년 2월 1일 왕정이 폐지되며 소멸했다.',
    startEra: 'AD', startYear: 1920, startMonth: 3,
    endEra: 'AD', endYear: 1946, endMonth: 2,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
  {
    name: '헝가리 국민통합정부',
    enName: 'Government of National Unity (Hungary)',
    nameOrigin:
      '헝가리어 Nemzeti Összefogás Kormánya. 수반 살러시 페렌츠가 국가원수와 총리를 겸한 "국민 지도자(nemzetvezető)"를 칭해 ' +
      '"살러시 정권" 또는 소속 정당 이름을 따 "화살십자당 정권"으로도 부른다.',
    description:
      '1944년 10월 15일 섭정 호르티가 라디오로 소련과의 휴전을 발표하자, 독일이 판처파우스트 작전으로 호르티의 아들을 납치해 ' +
      '그를 퇴진시키고 10월 16일 극우 화살십자당 당수 살러시 페렌츠를 수반으로 세운 친독 괴뢰 정권. ' +
      '11월 4일 의회가 살러시를 "국민 지도자"로 승인했다. 끝까지 독일 편에서 전쟁을 이어 가며 부다페스트 포위전(1944.12~1945.2)을 치렀고, ' +
      '화살십자 민병대가 부다페스트의 유대인 수만 명을 학살하고 아이히만의 강제 이송에 협력했다. ' +
      '같은 시기 소련 점령지 데브레첸에는 임시 국민정부(1944.12, 덜노키 미클로시 벨러)가 들어서 두 정부가 공존했다. ' +
      '1945년 3월 28일 살러시가 국외로 도피하며 국내 통치가 끝났고, 5월 미군에 체포되어 1946년 인민재판 후 처형되었다.',
    startEra: 'AD', startYear: 1944, startMonth: 10,
    endEra: 'AD', endYear: 1945, endMonth: 3,
    stateType: HistoricalStateType.OTHER,
    // 비시 프랑스·크로아티아 독립국과 같은 단명 괴뢰 정권
    entityKind: HistoricalEntityKind.REGIME,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
  {
    name: '헝가리 제2공화국',
    enName: 'Second Hungarian Republic',
    description:
      '1946년 2월 1일 왕정 폐지와 함께 선포된 공화국. 틸디 졸탄이 대통령, 소지주당이 1945년 총선 제1당이었으나 ' +
      '소련 점령 아래 공산당(라코시 마차시)이 "살라미 전술"로 연립 상대를 차례로 무력화했다. ' +
      '1947년 파리 강화조약으로 트리아농 국경이 복원되었고, 1948년 사회민주당을 흡수한 근로자당이 권력을 독점한 뒤 ' +
      '1949년 8월 20일 소련식 헌법을 채택해 인민공화국으로 바뀌었다.',
    startEra: 'AD', startYear: 1946, startMonth: 2,
    endEra: 'AD', endYear: 1949, endMonth: 8,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
  {
    name: '헝가리 인민공화국',
    enName: "Hungarian People's Republic",
    description:
      '1949년 8월 20일 헌법 채택으로 성립한 공산 국가. 라코시 마차시의 스탈린주의 통치 아래 집단화·숙청이 이어졌고, ' +
      '1949년 코메콘, 1955년 바르샤바 조약기구에 가입했다. 1956년 10월 23일 시작된 헝가리 혁명에서 너지 임레 정부가 ' +
      '바르샤바 조약 탈퇴와 중립을 선언했으나 11월 소련군에 진압되었다. 이후 카다르 야노시가 1988년까지 집권하며 ' +
      '1968년 신경제 메커니즘 등 상대적으로 유연한 "굴라시 공산주의"를 폈다. 1989년 원탁회의를 거쳐 ' +
      '10월 23일 공화국 선포와 함께 막을 내렸다.',
    startEra: 'AD', startYear: 1949, startMonth: 8,
    endEra: 'AD', endYear: 1989, endMonth: 10,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
  {
    name: '헝가리 제3공화국',
    enName: 'Hungary (Third Republic)',
    nameOrigin:
      '1989년 헌법 개정으로 국호가 헝가리 공화국(Magyar Köztársaság)이 되었고, ' +
      '2012년 1월 1일 시행된 기본법으로 공식 국호가 "헝가리(Magyarország)"로 바뀌었다.',
    description:
      '1956년 혁명 33주년인 1989년 10월 23일 선포된 공화국. 1990년 첫 자유 총선으로 안탈 요제프 내각이 들어섰고, ' +
      '1991년 소련군이 철수했다. 1999년 NATO, 2004년 유럽연합에 가입했으며 2007년 솅겐 지역에 들어갔다. ' +
      '2010년 이후 오르반 빅토르의 피데스 정부가 2011년 새 기본법을 제정했다.',
    startEra: 'AD', startYear: 1989, startMonth: 10,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    ...BUDAPEST,
    linkToIsoCodes: ['HU'],
  },
]

export async function seedHungaryHistoricalCountries(prisma: PrismaService): Promise<void> {
  console.log('\n🇭🇺 헝가리 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((entry) => entry.linkToIsoCodes))
  for (const isoCode of allIsoCodes) {
    const country = await prisma.country.findFirst({ where: { isoCode }, select: { id: true } })
    if (country) {
      isoToModernId.set(isoCode, country.id)
    } else {
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({ where: { name: entry.name } })

    let id: string
    if (existing) {
      id = existing.id
      console.log(`  ⏭️  ${entry.name}`)
    } else {
      const created = await prisma.historicalCountry.create({
        data: {
          name: entry.name,
          enName: entry.enName,
          nameOrigin: entry.nameOrigin,
          description: entry.description,
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          endEra: entry.endEra as any,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          stateType: entry.stateType,
          entityKind: entry.entityKind,
          latitude: entry.latitude,
          longitude: entry.longitude,
          accountId: ACCOUNT_ID,
        },
      })
      id = created.id
      console.log(`  ✅ ${entry.name}`)
    }

    for (const isoCode of entry.linkToIsoCodes) {
      const modernCountryId = isoToModernId.get(isoCode)
      if (!modernCountryId) continue
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId },
        })
      }
    }
  }

  console.log(`✅ 헝가리 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
