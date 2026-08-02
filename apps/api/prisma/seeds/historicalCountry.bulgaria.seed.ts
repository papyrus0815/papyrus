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
  // ── 유목 기원 ─────────────────────────────────────────────────────
  {
    name: '고대 대불가리아',
    enName: 'Old Great Bulgaria',
    nameOrigin:
      '동로마 사료가 쿠브라트의 나라를 "옛 대불가리아(Palaia Megale Boulgaria)"라 부른 데서 온 이름으로, ' +
      '뒤에 성립한 다뉴브·볼가의 불가리아들과 구분하기 위한 명칭이다.',
    description:
      '632년경 쿠브라트가 아바르·서돌궐의 지배에서 벗어나 오노구르 불가르 부족들을 통합해 ' +
      '폰토스-카스피 초원에 세운 유목 국가. 중심지는 아조프해 연안이었고 전승상 수도는 타만 반도의 파나고리아다. ' +
      '쿠브라트 사후 하자르의 압박으로 와해되어 아들들이 각지로 흩어졌으며, ' +
      '그중 아스파루흐가 다뉴브 하류로 남하해 불가리아 제1제국의 기원이 되었고 ' +
      '코트라그 계열은 볼가 불가리아로 이어졌다.',
    startEra: 'AD', startYear: 632,
    endEra: 'AD', endYear: 668,
    stateType: HistoricalStateType.KHANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.28, longitude: 36.97,
    linkToIsoCodes: ['UA', 'RU'],
  },

  // ── 제1제국과 제2제국 ─────────────────────────────────────────────
  {
    name: '불가리아 제1제국',
    enName: 'First Bulgarian Empire',
    nameOrigin:
      '중앙아시아에서 서진한 튀르크계 불가르족의 이름에서 왔으며, 다뉴브 정착 후 슬라브 다수 주민과 융합하며 ' +
      '오늘날의 불가리아인이 형성되었다.',
    description:
      '681년 아스파루흐가 다뉴브를 건너 동로마와의 조약으로 인정받으며 성립한 불가르-슬라브 국가. ' +
      '수도는 플리스카, 이후 프레슬라프였다. 9세기 초 크룸이 세르디카(소피아)를 병합하고 ' +
      '아바르 붕괴 후 그 동부 영역을 흡수하며 발칸의 강국으로 성장했다. ' +
      '864년 보리스 1세가 기독교를 받아들였고, 시메온 1세(893~927)는 차르를 칭하며 ' +
      '프레슬라프 문예학교를 중심으로 황금기를 열어 키릴 문자의 요람이 되었다. ' +
      '10세기 말 사무일이 오흐리드를 중심으로 저항을 이어갔으나 1018년 바실리오스 2세에게 정복되어 동로마에 병합되었다.',
    startEra: 'AD', startYear: 681,
    endEra: 'AD', endYear: 1018,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.38, longitude: 27.13,
    // RO=북부 도브루자가 681 창건 정주지구(메트로폴 블록과 연속). RS(베오그라드~모라바 약 190년)는
    // '메트로폴 보유 정체의 이웃 변경 병합'=단일링크 규범이라 제외(적대 검증 판정).
    // MK(말기 수도 오흐리드·사무일 중심지)는 현대 국가 미등록 — 등록 후 재실행 시 링크(덴마크 전례)
    linkToIsoCodes: ['BG', 'RO', 'MK'],
  },
  {
    name: '불가리아 제2제국',
    enName: 'Second Bulgarian Empire',
    description:
      '1185년 아센과 페터르 형제가 동로마 지배에 맞서 봉기해 터르노보를 수도로 재건한 불가리아인의 제국. ' +
      '칼로얀이 1204년 교황에게서 왕관을 받고 라틴 제국을 격파했으며, ' +
      '이반 아센 2세(1218~1241) 치세에 발칸 대부분을 아우르는 전성기를 누렸다. ' +
      '이후 몽골 침입과 내분으로 쇠퇴해 14세기 후반 터르노보·비딘으로 분열되었고, ' +
      '1393년 터르노보가 함락되고 1395년 니코폴에서 이반 시슈만이 처형됐으며, ' +
      '1396년 니코폴리스 전투 승리 직후 오스만이 비딘마저 함락하며 병합되었다' +
      '(스라치미르의 아들 콘스탄틴 2세는 1422년 사망 시까지 제위를 칭했다).',
    startEra: 'AD', startYear: 1185,
    endEra: 'AD', endYear: 1396,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.08, longitude: 25.62,
    linkToIsoCodes: ['BG'],
  },

  // ── 근대 부활 ─────────────────────────────────────────────────────
  {
    name: '불가리아 공국',
    enName: 'Principality of Bulgaria',
    description:
      '1877~78년 러시아-튀르크 전쟁 뒤 산스테파노 조약과 베를린 조약(1878년 7월)으로 성립한 ' +
      '오스만 종주권 하의 자치 공국. 초대 공은 알렉산더르 바텐베르크였고 1887년부터 페르디난트가 다스렸다. ' +
      '1885년 동루멜리아를 무혈 통합해 영토를 배가했으며, ' +
      '1908년 10월 페르디난트 1세가 완전 독립과 차르국 승격을 선언하며 불가리아 왕국으로 이어졌다.',
    startEra: 'AD', startYear: 1878, startMonth: 7,
    endEra: 'AD', endYear: 1908, endMonth: 10,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.70, longitude: 23.32,
    linkToIsoCodes: ['BG'],
  },
  {
    name: '동루멜리아',
    enName: 'Eastern Rumelia',
    nameOrigin:
      '"루멜리아"는 오스만이 발칸 영토를 부르던 이름("로마인의 땅")으로, 그 동부라는 뜻의 행정 명칭이다.',
    description:
      '1878년 베를린 조약이 산스테파노 대불가리아를 축소하면서 발칸 산맥 이남에 만든 오스만 제국의 자치주. ' +
      '주도는 플로브디프였고 술탄이 임명하는 기독교도 총독이 다스렸다. ' +
      '주민 다수가 불가리아인이라 통합 운동이 이어졌고, 1885년 9월 무혈 쿠데타로 불가리아 공국과의 통합을 선언해 ' +
      '이듬해 열강의 추인을 받았다.',
    startEra: 'AD', startYear: 1878, startMonth: 7,
    endEra: 'AD', endYear: 1885, endMonth: 9,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.15, longitude: 24.75,
    linkToIsoCodes: ['BG'],
  },
  {
    name: '불가리아 왕국',
    enName: 'Kingdom of Bulgaria',
    description:
      '1908년 10월 페르디난트 1세가 오스만에서 완전 독립을 선언하고 차르를 칭하며 성립한 왕국(차르국). ' +
      '발칸 전쟁(1912~13)으로 영토를 얻었다 잃었고, 1·2차 세계대전에서 모두 동맹국·추축국 측에 섰다. ' +
      '2차 대전 말 소련의 진주와 1944년 조국전선 쿠데타를 거쳐, ' +
      '1946년 9월 국민투표로 군주제가 폐지되고 어린 차르 시메온 2세가 망명하며 소멸했다.',
    startEra: 'AD', startYear: 1908, startMonth: 10,
    endEra: 'AD', endYear: 1946, endMonth: 9,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.70, longitude: 23.32,
    linkToIsoCodes: ['BG'],
  },

  // ── 현대 ─────────────────────────────────────────────────────────
  {
    name: '불가리아 인민 공화국',
    enName: "People's Republic of Bulgaria",
    description:
      '1946년 9월 국민투표로 군주제를 폐지하고 선포된 공산주의 국가. 게오르기 디미트로프가 초대 총리를 지냈고, ' +
      '토도르 지프코프가 1954년부터 35년간 통치하며 소련의 가장 긴밀한 위성국으로 남았다. ' +
      '1989년 11월 지프코프 실각 후 민주화가 진행되어 1990년 11월 국명을 불가리아 공화국으로 바꾸며 막을 내렸다.',
    startEra: 'AD', startYear: 1946, startMonth: 9,
    endEra: 'AD', endYear: 1990, endMonth: 11,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.70, longitude: 23.32,
    linkToIsoCodes: ['BG'],
  },
  {
    name: '불가리아 공화국',
    enName: 'Republic of Bulgaria',
    description:
      '1990년 11월 인민공화국에서 국명을 바꾸고 민주주의·시장경제로 전환한 현대 불가리아. ' +
      '1991년 신헌법을 채택했으며, 2004년 나토(NATO), 2007년 유럽연합(EU)에 가입했다' +
      '(이로써 키릴 문자가 EU의 공식 문자가 되었다).',
    startEra: 'AD', startYear: 1990, startMonth: 11,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.70, longitude: 23.32,
    linkToIsoCodes: ['BG'],
  },
]

export async function seedBulgariaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇧🇬 불가리아 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 불가리아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
