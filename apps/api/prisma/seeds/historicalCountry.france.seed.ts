import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

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

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 중세·근세 프랑스 왕국 ────────────────────────────────────────────
  {
    name: '서프랑크 왕국',
    enName: 'West Francia',
    description:
      '843년 베르됭 조약으로 카롤루스 제국이 3분할되면서 샤를 2세(대머리왕)가 받은 서쪽 왕국. ' +
      '센·루아르·론 유역을 중심으로 한 영토가 현대 프랑스의 모태가 되었다. ' +
      '987년 마지막 카롤링거 왕 루이 5세가 후계 없이 사망한 후 위그 카페가 선출되어 카페 왕조가 성립하면서 프랑스 왕국으로 이어진다.',
    startEra: 'AD', startYear: 843,
    endEra: 'AD', endYear: 987,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 왕국',
    enName: 'Kingdom of France',
    description:
      '987년 위그 카페의 즉위로 시작된 프랑스의 군주제 국가. 카페 왕조(987~1328), ' +
      '발루아 왕조(1328~1589), 부르봉 왕조(1589~1792) 3개 가문이 차례로 통치하며 ' +
      '약 800년에 걸쳐 유럽 대륙의 핵심 강국으로 발전했다. ' +
      '중세에는 백년전쟁(1337~1453)을 거치며 영토를 통합하고, 16세기 이탈리아 전쟁에서 ' +
      '합스부르크와 패권을 다퉜으며, 17세기 루이 14세 치세에 절대왕정의 정점에 도달했다. ' +
      '1789년 프랑스 혁명, 1792년 9월 21일 국민공회의 왕정 폐지 선언으로 막을 내렸다.',
    startEra: 'AD', startYear: 987,
    endEra: 'AD', endYear: 1792,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },

  // ── 제국 봉토(로렌) ─────────────────────────────────────────────────
  {
    name: '로트링겐 공국',
    enName: 'Duchy of Lorraine',
    nameOrigin:
      '카롤루스 대제의 손자 로타르 2세의 왕국 "로타리 레그눔(Lotharii Regnum)"에서 유래해 "로타링기아(Lotharingia)"로 불렸고, ' +
      '독일어 로트링겐(Lothringen)·프랑스어 로렌(Lorraine)이 여기서 갈라져 나왔다.',
    description:
      '959년 로타링기아가 상·하 둘로 나뉘며 성립한 상(上)로트링겐 공국. ' +
      '1048년경 알자스 가문의 제라르가 세습 공작위를 확립한 뒤 낭시를 수도로 삼아 로렌 가문이 다스린 신성로마제국의 봉토(상라인 관구)였다. ' +
      '프랑스와 독일 문화가 교차하는 접경 공국으로, 마지막 공작 프랑수아 슈테판이 1737년 토스카나 대공국과 맞바꿔 로렌을 내놓으면서 ' +
      '폐위된 폴란드 왕 스타니스와프 레슈친스키에게 넘어갔고, 1766년 그의 사망과 함께 프랑스 왕국에 병합되어 하나의 주(province)로 편입되었다. ' +
      '한편 프랑수아 슈테판은 마리아 테레지아와 혼인해 합스부르크-로트링겐 왕조를 열어 오스트리아를 통치했다. ' +
      '(같은 뿌리인 하로트링겐은 일찍이 브라반트 공국 등으로 분열했다.)',
    startEra: 'AD', startYear: 959,
    endEra: 'AD', endYear: 1766, endMonth: 2,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.69, longitude: 6.18,
    linkToIsoCodes: ['FR'],
  },

  // ── 혁명·나폴레옹 시대 ──────────────────────────────────────────────
  {
    name: '프랑스 제1공화국',
    enName: 'First French Republic',
    description:
      '1792년 9월 21일 국민공회가 왕정 폐지를 선언하면서 수립된 공화국. ' +
      '국민공회기·총재정부기·통령정부기를 거치며 격렬한 정치 변동을 겪었다. ' +
      '1804년 나폴레옹 보나파르트가 프랑스인의 황제로 즉위하면서 사실상 종결되었다.',
    startEra: 'AD', startYear: 1792,
    endEra: 'AD', endYear: 1804,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 제1제국',
    enName: 'First French Empire',
    description:
      '1804년 5월 18일 나폴레옹 보나파르트가 황제로 즉위하면서 수립된 제국. ' +
      '아우스터리츠(1805)·예나(1806)·프리들란트(1807) 등의 전승으로 ' +
      '유럽 대륙 대부분을 지배하는 절정기를 누렸으나, ' +
      '1812년 러시아 원정 실패 후 급속히 붕괴, 1814년 4월 나폴레옹의 1차 퇴위로 종결되었다. ' +
      '1815년 백일천하로 잠시 부활했으나 워털루 전투 패배로 다시 종결되었다.',
    startEra: 'AD', startYear: 1804,
    endEra: 'AD', endYear: 1815,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },

  // ── 19세기 ─────────────────────────────────────────────────────────
  {
    name: '부르봉 복고 왕정',
    enName: 'Bourbon Restoration',
    description:
      '1814~1815년 나폴레옹 몰락 후 빈 회의 결정으로 부르봉 왕가가 복귀하여 수립된 입헌군주국. ' +
      '루이 18세·샤를 10세가 차례로 즉위했으나, 샤를 10세의 반동 정책에 반발한 1830년 7월 혁명으로 종결되었다.',
    startEra: 'AD', startYear: 1814,
    endEra: 'AD', endYear: 1830,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '7월 왕정',
    enName: 'July Monarchy',
    description:
      '1830년 7월 혁명으로 샤를 10세가 퇴위한 후 오를레앙 가문의 루이 필리프 1세가 즉위하면서 수립된 입헌군주국. ' +
      '"시민 왕"을 자임했으나 상층 부르주아 중심의 제한 선거제와 경제 위기로 점차 지지를 잃었으며, ' +
      '1848년 2월 혁명으로 종결되었다.',
    startEra: 'AD', startYear: 1830,
    endEra: 'AD', endYear: 1848,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 제2공화국',
    enName: 'French Second Republic',
    description:
      '1848년 2월 혁명으로 7월 왕정이 무너진 후 수립된 공화국. ' +
      '보통선거(남성)·노동권 등 급진적 사회 개혁을 시도했으나, 6월 봉기 진압과 12월 대통령 선거에서 ' +
      '루이 나폴레옹 보나파르트(나폴레옹 1세의 조카)가 당선된 후 1851년 12월 그의 친위 쿠데타로 종결, ' +
      '이듬해 제2제국으로 전환되었다.',
    startEra: 'AD', startYear: 1848,
    endEra: 'AD', endYear: 1852,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 제2제국',
    enName: 'French Second Empire',
    description:
      '1852년 12월 2일 루이 나폴레옹이 나폴레옹 3세로 즉위하면서 수립된 제국. ' +
      '오스만 남작의 파리 재정비, 크림 전쟁(1853~1856) 참전, 이탈리아 통일 지원 등을 추진했으나, ' +
      '1870년 보불 전쟁(프랑스-프로이센 전쟁)에서 스당에서 포로가 되면서 붕괴, 9월 4일 공화국 선포로 종결되었다.',
    startEra: 'AD', startYear: 1852,
    endEra: 'AD', endYear: 1870,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 제3공화국',
    enName: 'French Third Republic',
    description:
      '1870년 9월 4일 보불 전쟁 중 나폴레옹 3세 실각 후 수립된 공화국. ' +
      '약 70년간 존속하면서 정교 분리(1905)·식민 제국 확장·제1차 세계대전 승전 등 굵직한 사건을 겪었다. ' +
      '1940년 6월 나치 독일의 침공과 페탱의 휴전 결정으로 사실상 종결, 비시 정권으로 대체되었다.',
    startEra: 'AD', startYear: 1870,
    endEra: 'AD', endYear: 1940,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '비시 프랑스',
    enName: 'Vichy France',
    description:
      '1940년 7월 10일 페탱이 의회로부터 전권을 위임받아 비시에 수립한 권위주의 정권. ' +
      '나치 독일과 휴전 협정을 맺고 프랑스 남부를 통치했으나 1942년 11월 독일군의 전 영토 점령 후 ' +
      '사실상 괴뢰 정권화. 1944년 8월 파리 해방 후 종결되었다.',
    startEra: 'AD', startYear: 1940,
    endEra: 'AD', endYear: 1944,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 46.1, longitude: 3.4,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 제4공화국',
    enName: 'French Fourth Republic',
    description:
      '1944년 파리 해방 후 임시정부 시기를 거쳐 1946년 10월 새 헌법으로 출범한 공화국. ' +
      '인도차이나 전쟁·알제리 전쟁 등 식민지 위기와 잦은 내각 교체로 정치적 불안정이 누적되어 ' +
      '1958년 5월 알제리 사태를 계기로 드골에게 전권이 위임되면서 종결, 제5공화국으로 전환되었다.',
    startEra: 'AD', startYear: 1946,
    endEra: 'AD', endYear: 1958,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
  {
    name: '프랑스 제5공화국',
    enName: 'French Fifth Republic',
    description:
      '1958년 9월 28일 국민투표로 채택된 새 헌법에 따라 수립된 현재의 공화국 체제. ' +
      '강한 대통령제를 도입하여 정치적 안정을 회복했으며, 드골·미테랑·시라크 등이 차례로 통치했다. ' +
      '현재까지 존속하고 있다.',
    startEra: 'AD', startYear: 1958,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.9, longitude: 2.3,
    linkToIsoCodes: ['FR'],
  },
]

export async function seedFranceHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇫🇷 프랑스 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((e) => e.linkToIsoCodes))
  for (const isoCode of allIsoCodes) {
    const country = await prisma.country.findFirst({
      where: { isoCode },
      select: { id: true },
    })
    if (country) {
      isoToModernId.set(isoCode, country.id)
    } else {
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({
      where: { name: entry.name },
    })

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

  console.log(`✅ 프랑스 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
