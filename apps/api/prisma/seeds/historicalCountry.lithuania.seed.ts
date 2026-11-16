import { Era, HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 리투아니아 — 1차 세계대전 이후(1915~) 역사 국가.
 *
 * 기존 DB에는 리투아니아 대공국(1236~1795)·폴란드-리투아니아 연방·리투아니아 SSR(1940~1991)만 있었고,
 * 독립 리투아니아(1918~1940)·중부 리투아니아·독일 점령 통치구·1990년 이후 공화국이 비어
 * 리투아니아 SSR에 전신도 후신도 없었다. 1795~1915년(러시아 제국령)이 비는 것은 의도된 공백이다
 * (러시아 제국에 LT를 달지 않는 규범 B — 우크라이나 드니프로 양안과 같다).
 *
 * ## 명명
 * - 1918~1940 = '리투아니아 제1공화국'(리투아니아 사학의 Pirmoji Lietuvos Respublika).
 *   bare '리투아니아 공화국'은 현행 국가(1990~) 몫 — 루마니아·우크라이나 공화국 행명 관례.
 * - 독일 민정 통치구 = '오스트란트 제국판무관부' — 우크라이나 시드가 쓴 표기(오스트란트·우크라이나 두 판무관부)에 맞춘다.
 *
 * ## 판정
 * - 리투아니아는 1918년 국가와 오늘의 국가가 같은 나라라는 '국가 연속성' 입장이지만, 이 코퍼스는 그 사이의
 *   리투아니아 SSR을 별도 행으로 이미 두고 있어(우크라이나·몰도바 선례) 제1공화국과 현 공화국을 나눈다.
 *   연속성 입장은 두 행의 서술이 맡는다.
 * - 1918년 7~11월의 '리투아니아 왕국'(민다우가스 2세 추대·철회)은 넉 달의 헌정 단계라 제1공화국 서술에 둔다.
 * - 1926~1940 스메토나 권위주의 체제도 같은 국가의 정권이라 제1공화국 서술에 둔다(별도 REGIME 행 후보).
 */

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  startEra?: Era
  startYear?: number
  startMonth?: number
  startDay?: number
  endEra?: Era
  endYear?: number
  endMonth?: number
  endDay?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 1차 세계대전: 독일 군정 ───────────────────────────────────────
  {
    name: '오버 오스트',
    enName: 'Ober Ost',
    nameOrigin:
      '독일어 "오버 오스트(Ober Ost)"는 "동부 전선 독일군 총사령관(Oberbefehlshaber der gesamten Deutschen ' +
      'Streitkräfte im Osten)"의 줄임말이다. 총사령관 직함이 그대로 그가 다스린 점령 통치구의 이름이 되었다.',
    description:
      '1915년 독일군이 러시아 제국의 서북부를 점령한 뒤 힌덴부르크·루덴도르프의 동부 총사령부가 직접 다스린 ' +
      '군정 통치구. 쿠를란트(라트비아 서부)·리타우엔(리투아니아)·비아위스토크-그로드노 지구로 나뉘었고, ' +
      '도로·철도 건설과 함께 징발·강제 노역·언론 통제를 폈다. 독일이 동유럽을 독일화 식민 공간으로 보던 ' +
      '시각의 실험장이었다는 평가가 있다. 그 통치 아래서 1917년 리투아니아 평의회(타리바)가 꾸려져 1918년 2월 ' +
      '독립을 선언했다. 1918년 11월 휴전 뒤 민정을 리투아니아 정부에 넘겼으나 독일군 철수는 1919년까지 이어졌다.',
    startEra: 'AD', startYear: 1915,
    endEra: 'AD', endYear: 1918, endMonth: 11,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 54.8985, longitude: 23.9036, // 사령부 소재지 카우나스(코브노)
    linkToIsoCodes: ['LT', 'LV', 'BY', 'PL'],
  },

  // ── 독립 리투아니아 ───────────────────────────────────────────────
  {
    name: '리투아니아 제1공화국',
    enName: 'First Republic of Lithuania',
    nameOrigin:
      '"리투아니아(Lietuva)"는 11세기 독일 연대기에 "리트바(Litua)"로 처음 보인다. 어원은 네리스강의 지류 ' +
      '"리에타우카(Lietauka)" 개울에서 왔다는 설, 대공의 친위 무사단 "레이티스(leičiai)"에서 왔다는 설 등이 있다. ' +
      '"제1공화국"은 1990년에 회복된 공화국과 구별해 리투아니아 사학이 붙인 이름이다.',
    description:
      '1918년 2월 16일 독일 점령하의 빌뉴스에서 리투아니아 평의회(타리바)가 독립 선언서를 채택하며 성립한 국가. ' +
      '그해 7월 평의회가 우라흐 공작 빌헬름을 민다우가스 2세로 추대했다가 11월 철회하고 공화정을 택했다. ' +
      '1919년 빌뉴스를 잃고 카우나스를 "임시 수도"로 삼은 채 1918~1920년 볼셰비키·베르몬트군·폴란드와 독립 전쟁을 ' +
      '치렀다. 1920년 7월 소련과 평화 조약으로 빌뉴스를 인정받았으나 10월 폴란드가 다시 차지했다. 1923년 클라이페다(메멜) 지방을 ' +
      '병합했고, 1926년 쿠데타 뒤 안타나스 스메토나의 권위주의 체제가 이어졌다. 1939년 나치 독일에 클라이페다를 ' +
      '내주고 소련으로부터 빌뉴스를 돌려받았으나, 1940년 6월 15일 소련군이 진주해 8월 소련에 병합되었다. ' +
      '리투아니아는 이 병합을 불법 점령으로 보아 1918년 국가가 끊기지 않았다는 국가 연속성 입장을 취한다.',
    startEra: 'AD', startYear: 1918, startMonth: 2, startDay: 16,
    endEra: 'AD', endYear: 1940, endMonth: 6, endDay: 15,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.8985, longitude: 23.9036, // 임시 수도 카우나스
    linkToIsoCodes: ['LT'],
  },
  {
    name: '중부 리투아니아',
    enName: 'Republic of Central Lithuania',
    nameOrigin:
      '폴란드어 "리트바 시로트코바(Litwa Środkowa)". 옛 리투아니아 대공국의 중심부라는 뜻을 담아, 폴란드와 ' +
      '리투아니아 어느 쪽에도 속하지 않은 독자 국가처럼 보이도록 지은 이름이다.',
    description:
      '1920년 10월 폴란드군의 젤리고프스키 장군이 상부의 지시를 거스른 "반란"으로 꾸며 빌뉴스를 점령한 뒤 세운 ' +
      '국가. 실제로는 피우수트스키가 기획한 폴란드의 위성국이었다. 리투아니아와의 국제 연맹 중재가 결렬된 뒤 ' +
      '1922년 1월 선거로 뽑힌 빌뉴스 의회가 폴란드 병합을 결의했고, 3월 폴란드 의회가 이를 받아들여 소멸했다. ' +
      '리투아니아는 이를 인정하지 않고 1938년까지 폴란드와 국교를 끊었다.',
    startEra: 'AD', startYear: 1920, startMonth: 10, startDay: 12,
    endEra: 'AD', endYear: 1922, endMonth: 3,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.6872, longitude: 25.2797, // 빌뉴스
    // 빌뉴스는 LT, 브라슬라우·아시먀니·리다 등 동부는 오늘날 BY
    linkToIsoCodes: ['LT', 'BY'],
  },

  // ── 2차 세계대전: 독일 민정 통치구 ─────────────────────────────────
  {
    name: '오스트란트 제국판무관부',
    enName: 'Reichskommissariat Ostland',
    nameOrigin:
      '독일어 "라이히스코미사리아트 오스트란트(Reichskommissariat Ostland)" — "동방 땅"을 다스리는 제국판무관의 ' +
      '민정 통치구. 동방 점령지에 둔 두 판무관부(오스트란트·우크라이나) 가운데 하나다.',
    description:
      '1941년 7월 독일이 소련으로부터 빼앗은 발트 3국과 벨라루스 서부에 세운 민정 통치기구. 힌리히 로제가 ' +
      '제국판무관으로 리가에 본부를 두었고, 리타우엔·레틀란트·에스틀란트·바이스루테니엔 네 총관구로 나뉘었다. ' +
      '리투아니아 유대인 대부분이 학살된 홀로코스트의 현장이었다(포나리 학살 등). 1944년 소련군의 진격으로 ' +
      '대부분을 잃었고 쿠를란트 포위지가 1945년 5월 항복하며 끝났다.',
    startEra: 'AD', startYear: 1941, startMonth: 7,
    endEra: 'AD', endYear: 1945, endMonth: 5,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 56.9496, longitude: 24.1052, // 리가
    linkToIsoCodes: ['LT', 'LV', 'EE', 'BY'],
  },

  // ── 현대 ──────────────────────────────────────────────────────────
  {
    name: '리투아니아 공화국',
    enName: 'Republic of Lithuania',
    nameOrigin:
      '리투아니아어 "리에투보스 레스푸블리카(Lietuvos Respublika)". 1990년 회복 법령이 1918년 국가의 이름을 그대로 되살렸다.',
    description:
      '1990년 3월 11일 리투아니아 SSR 최고회의가 "리투아니아 국가 회복 법령"을 채택해, 소련 구성 공화국 가운데 ' +
      '처음으로 독립을 선언하며 회복한 국가. 1991년 1월 소련군이 빌뉴스 텔레비전 탑을 공격해 14명이 숨졌으나 ' +
      '(1월 13일 사건) 물러서지 않았고, 8월 쿠데타 실패 뒤 9월 6일 소련이 독립을 인정했다. ' +
      '1918년 국가를 잇는다는 연속성 입장에 서 있으며, 2004년 나토와 유럽 연합에 가입했다.',
    startEra: 'AD', startYear: 1990, startMonth: 3, startDay: 11,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.6872, longitude: 25.2797, // 빌뉴스
    linkToIsoCodes: ['LT'],
  },
]

export async function seedLithuaniaHistoricalCountries(prisma: PrismaService): Promise<void> {
  console.log('\n🇱🇹 리투아니아 역사 국가(1915~) 시딩...')

  const isoCodes = [...new Set(ENTRIES.flatMap((entry) => entry.linkToIsoCodes))]
  const isoToModernId = new Map<string, string>()
  for (const isoCode of isoCodes) {
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
          startEra: entry.startEra,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          startDay: entry.startDay,
          endEra: entry.endEra,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          endDay: entry.endDay,
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
        await prisma.historicalCountryModernCountry.create({ data: { historicalCountryId: id, modernCountryId } })
      }
    }
  }

  console.log(`✅ 리투아니아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
