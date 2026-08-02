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

// 카란타니아 공국(658~828)은 중심지가 오스트리아 케른텐이라 austria 시드에서 관리한다.
const ENTRIES: HistoricalCountryEntry[] = [
  // ── 합스부르크 왕관령 ─────────────────────────────────────────────
  {
    name: '카르니올라 공국',
    enName: 'Duchy of Carniola',
    nameOrigin:
      '슬라브어로 "크란(Kranj) 사람들의 땅"을 뜻하는 크란스카(Kranjska)에서 온 이름으로, 라틴어 카르니올라(Carniola)는 ' +
      '알프스에 살던 켈트계 카르니족(Carni)과 같은 어근이다. 독일어로는 크라인(Krain)이라 불렀다.',
    description:
      '1364년 합스부르크의 루돌프 4세가 크라인 변경백령의 공국 승격을 선언하며 성립한 합스부르크 세습령(제국의 공식 추인은 1590년). ' +
      '수도는 류블랴나(독일어명 라이바흐)이며, 케른텐·슈타이어마르크와 함께 이너 오스트리아를 구성했다. ' +
      '주민 다수가 슬로베니아인으로, 근대 슬로베니아 민족운동의 중심 무대였다. ' +
      '1809~1813년 나폴레옹의 일리리아 주(류블랴나가 수도)에 편입되는 중단기를 거쳐 오스트리아에 복귀했고, ' +
      '1849년부터 제국 직속 왕관령으로 존속하다 1918년 제국 해체와 함께 대부분이 세르비아-크로아티아-슬로베니아 왕국에 귀속되었다. ' +
      '서부 내카르니올라(포스토이나 일대)는 1920년 라팔로 조약으로 이탈리아 왕국에 넘어갔다가 2차 대전 후 유고슬라비아로 반환되었다. ' +
      '오늘날 슬로베니아의 중핵 지역이다.',
    startEra: 'AD', startYear: 1364,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.06, longitude: 14.51,
    linkToIsoCodes: ['SI'],
  },

  // ── 중세 교회 국가 ────────────────────────────────────────────────
  // 아퀼레이아 총대주교령은 중심이 프리울리(이탈리아)지만 서부 슬로베니아(톨민·소차 계곡)를
  // 세속 통치한 국가라 이 파일에서 관리한다(베로나 변경백령을 austria 시드가 관리하는 전례).
  {
    name: '아퀼레이아 총대주교령',
    enName: 'Patriarchate of Aquileia',
    nameOrigin:
      '고대 로마의 요충 도시 아퀼레이아(Aquileia)에 좌를 둔 총대주교(Patriarcha)의 칭호에서 온 이름으로, ' +
      '세속 영지는 "프리울리의 조국(Patria del Friuli)"이라고도 불렸다.',
    description:
      '1077년 신성로마황제 하인리히 4세가 아퀼레이아 총대주교에게 프리울리 백작권을 수여하면서 성립한 ' +
      '신성로마제국의 교회 제후국. 프리울리를 본령으로 톨민·소차 계곡 등 서부 슬로베니아 일대까지 세속 통치했고, ' +
      '교회 관할로는 드라바강 이남의 슬로베니아 전역을 아울렀다. ' +
      '13세기 이후 총대주교좌는 우디네로 옮겨갔으며, 1420년 베네치아 공화국의 프리울리 정복으로 세속 권력을 상실했다' +
      '(총대주교직 자체는 1751년까지 존속). 중세 슬로베니아 서부의 정치·교회 질서를 규정한 세력이다.',
    startEra: 'AD', startYear: 1077,
    endEra: 'AD', endYear: 1420,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.77, longitude: 13.37,
    linkToIsoCodes: ['IT', 'SI'],
  },

  // ── 나폴레옹 시대 ─────────────────────────────────────────────────
  {
    name: '일리리아 주',
    enName: 'Illyrian Provinces',
    nameOrigin:
      '고대 로마의 일리리쿰 속주에서 따온 이름으로, 나폴레옹이 아드리아 동안의 할양지를 묶으며 고전 지명을 부활시켰다.',
    description:
      '1809년 10월 쇤브룬 조약으로 오스트리아가 할양한 카르니올라·서케른텐·고리치아·트리에스테·이스트리아·' +
      '시빌 크로아티아·달마티아·라구사를 묶어 나폴레옹이 세운 프랑스 제국의 특별 행정구. ' +
      '수도는 류블랴나(라이바흐)였고 마르몽 원수가 초대 총독을 지냈다. ' +
      '프랑스 민법전 시행, 신분제 특권 폐지와 함께 학교에서 슬로베니아어 사용을 허용해 ' +
      '슬로베니아 민족 각성의 중요한 계기가 되었다. 남단의 코토르 만은 1813년 말 영국 해군과 몬테네그로군의 ' +
      '포위로 상실했고, 1813년 오스트리아가 본토를 재점령한 뒤 빈 회의로 반환이 확정되어 ' +
      '1816년 오스트리아 일리리아 왕국으로 재편되었다.',
    startEra: 'AD', startYear: 1809, startMonth: 10,
    endEra: 'AD', endYear: 1813,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.06, longitude: 14.51,
    // ME(코토르 만)는 현대 국가 미등록 — 등록 후 재실행하면 링크된다(덴마크 DK/NO/SE 전례)
    linkToIsoCodes: ['SI', 'HR', 'IT', 'AT', 'ME'],
  },

  // ── 유고슬라비아 시대와 독립 ──────────────────────────────────────
  {
    name: '슬로베니아 사회주의 공화국',
    enName: 'Socialist Republic of Slovenia',
    description:
      '1943년 슬로베니아 해방전선의 코체베 의회를 기반으로 성립해 1945년 유고슬라비아 연방의 구성 공화국이 된 ' +
      '사회주의 공화국(초명은 인민공화국, 1963년 사회주의 공화국으로 개칭). 수도는 류블랴나. ' +
      '연방 내에서 가장 부유한 공화국이었으며 1980년대 후반 자유화 운동을 주도했다. ' +
      '1990년 4월 첫 다당제 선거에서 민주야당연합(DEMOS)이 집권했고, 같은 해 3월 국명에서 "사회주의"를 삭제했다. ' +
      '1990년 12월 23일 독립 국민투표에서 압도적 찬성(유권자 대비 88.5%)을 얻어 ' +
      '1991년 6월 25일 독립을 선언하며 현대 슬로베니아 공화국으로 이어졌다.',
    // 시작 1943 = 코체베 의회 기준 periodization(국가 실체 성립은 1944 SNOS 또는 1945 연방 편성설도 있음)
    startEra: 'AD', startYear: 1943,
    endEra: 'AD', endYear: 1991, endMonth: 6,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.06, longitude: 14.51,
    linkToIsoCodes: ['SI'],
  },
  {
    name: '슬로베니아 공화국',
    enName: 'Republic of Slovenia',
    description:
      '1991년 6월 25일 유고슬라비아 연방에서 독립을 선언하며 성립한 슬로베니아인의 국민국가. ' +
      '독립 선언 직후 유고 인민군과의 10일 전쟁을 브리오니 협정으로 마무리하며 사실상 독립을 확정했고, ' +
      '1992년 1월 유럽공동체(EC) 승인과 같은 해 5월 유엔 가입으로 국제적 승인을 얻었다. ' +
      '구유고 국가 중 가장 순조롭게 체제 전환에 성공해 2004년 유럽연합(EU)과 나토(NATO)에 가입했으며, ' +
      '2007년 구유고권 최초로 유로화를 도입했다.',
    startEra: 'AD', startYear: 1991, startMonth: 6,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.06, longitude: 14.51,
    linkToIsoCodes: ['SI'],
  },
]

/**
 * 다른 시드가 소유한 HC에 현대 슬로베니아 연결만 보강(크로아티아 시드의 EXTRA_MODERN_LINKS 패턴).
 * - 로마 계열 3국(공화국·제국·서로마)은 liberal 링크 정책 — 아퀼레이아 거점 편입(BC181)부터
 *   에모나(류블랴나)·포에토비오(프투이) 등 전역이 로마령
 * - 유고 계열 3국: 슬로베니아가 구성 지역. 유고슬라비아 연방 공화국(1992~2003)은
 *   세르비아·몬테네그로만이므로 제외
 * - 케른텐/슈타이어마르크 공국은 austria 시드 자체 linkToIsoCodes에 SI 포함
 * - 이탈리아 왕국(1920~47 프리모르스카)·베네치아 공화국(코페르·피란)·동고트 왕국은 적대 검증에서 기각:
 *   병합한 국민국가·해양 속령은 단일 링크가 이 앱의 규범(독일 제국=DE만·알자스-로렌 미링크 선례)
 */
const EXTRA_MODERN_LINKS: { hcName: string; isoCode: string }[] = [
  { hcName: '로마 공화국', isoCode: 'SI' },
  { hcName: '로마 제국', isoCode: 'SI' },
  { hcName: '서로마 제국', isoCode: 'SI' },
  { hcName: '세르비아-크로아티아-슬로베니아 왕국', isoCode: 'SI' },
  { hcName: '유고슬라비아 왕국', isoCode: 'SI' },
  { hcName: '유고슬라비아 사회주의 연방 공화국', isoCode: 'SI' },
]

export async function seedSloveniaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇸🇮 슬로베니아 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set([
    ...ENTRIES.flatMap((e) => e.linkToIsoCodes),
    ...EXTRA_MODERN_LINKS.map((e) => e.isoCode),
  ])
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

  // 타 시드 소유 HC → 현대 슬로베니아 연결 보강
  for (const extra of EXTRA_MODERN_LINKS) {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: extra.hcName },
    })
    const modernCountryId = isoToModernId.get(extra.isoCode)
    if (!hc || !modernCountryId) {
      if (!hc) console.warn(`  ⚠️  찾을 수 없음: ${extra.hcName}`)
      continue
    }
    const linkExists = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId: hc.id, modernCountryId },
    })
    if (!linkExists) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: hc.id, modernCountryId },
      })
      console.log(`  🔗 ${extra.hcName} ← 현대 ${extra.isoCode} 연결`)
    }
  }

  console.log(`✅ 슬로베니아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
