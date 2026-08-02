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
  // ── 중세 남슬라브 공국 ────────────────────────────────────────────
  {
    name: '두클랴',
    enName: 'Duklja',
    nameOrigin:
      '고대 로마 도시 독레아(Doclea)에서 온 이름으로, 슬라브어로 두클랴라 불렸다. ' +
      '11세기 후반부터는 "제타"라는 이름이 병용되기 시작했다.',
    description:
      '1040년경 스테판 보이슬라브가 동로마의 지배에 맞서 봉기해 아드리아 연안 남부에 세운 남슬라브 공국. ' +
      '1077년 미하일로가 교황 그레고리오 7세에게서 왕으로 인정받아(왕권 표장 수령) 왕국으로 승격했고, ' +
      '아들 콘스탄틴 보딘 치세에 라슈카·보스니아까지 아우르는 전성기를 누렸다. ' +
      '12세기 내분으로 쇠퇴해 1186년경 라슈카의 스테판 네마냐에게 병합되었으며, ' +
      '이후 이 지역은 제타라는 이름으로 네마니치 왕조 아래 놓였다. 몬테네그로 국가 전통의 기원으로 여겨진다.',
    startEra: 'AD', startYear: 1040,
    endEra: 'AD', endYear: 1186,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.47, longitude: 19.27,
    // AL(왕도 스카다르=슈코더르가 현 알바니아)은 현대 국가 미등록 — 등록 후 재실행 시 링크(덴마크 전례)
    linkToIsoCodes: ['ME', 'AL'],
  },
  {
    name: '제타 공국',
    enName: 'Principality of Zeta',
    description:
      '1371년 세르비아 제국이 와해되자 발샤 가문이 스카다르(슈코더르)를 중심으로 자립해 세운 공국' +
      '(발샤 1세는 1360년대에 이미 상제타를 장악했다). ' +
      '1421년 발샤 3세가 통치권을 세르비아 전제공국에 넘겨 한 세대 관할이 넘어갔다가, ' +
      '1451년부터 츠르노예비치 가문이 이어받아 1482년 체티네를 창건하고 산악 지대로 중심을 옮겼다. ' +
      '1496년 오스만의 압박으로 츠르노예비치 가문이 축출되며 저지대가 오스만령이 되었고, ' +
      '산악 지대의 잔여 세력은 주교후국 체제로 이어졌다. ' +
      '"몬테네그로(검은 산)"라는 이름이 이 시기 베네치아인들에 의해 쓰이기 시작했다.',
    startEra: 'AD', startYear: 1371,
    endEra: 'AD', endYear: 1496,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.39, longitude: 18.92,
    // AL(발샤기 수도 스카다르, 1396 베네치아 상실 전까지)은 현대 국가 미등록 — 미래용 표기
    linkToIsoCodes: ['ME', 'AL'],
  },

  // ── 신정에서 왕국으로 ─────────────────────────────────────────────
  {
    name: '몬테네그로 주교후국',
    enName: 'Prince-Bishopric of Montenegro',
    nameOrigin:
      '"몬테네그로"는 베네치아어로 "검은 산"이라는 뜻으로, 로브첸 산괴의 침엽수림에서 유래했다고 본다. ' +
      '현지어 이름 츠르나고라(Crna Gora)도 같은 뜻이다.',
    description:
      '오스만이 저지대를 장악한 뒤 체티네의 정교회 주교(블라디카)가 산악 부족들을 이끌며 형성된 신정 국가. ' +
      '블라디카는 본래 선출제였으나 1697년부터 페트로비치-네고시 가문이 삼촌-조카로 세습했다. ' +
      '오스만 제국이 명목상 영유권을 주장했으나 산악 지대는 실효 지배되지 않았고, ' +
      '시인이기도 한 페타르 2세 페트로비치 네고시 등은 러시아의 후원 아래 사실상 독립적으로 통치했다. ' +
      '1852년 다닐로가 성직을 버리고 세속 공국을 선포하며 막을 내렸다.',
    startEra: 'AD', startYear: 1516,
    endEra: 'AD', endYear: 1852,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.39, longitude: 18.92,
    linkToIsoCodes: ['ME'],
  },
  {
    name: '몬테네그로 공국',
    enName: 'Principality of Montenegro',
    description:
      '1852년 다닐로 1세가 블라디카 신정을 끝내고 선포한 세속 공국. ' +
      '1858년 그라호바츠 전투와 1876~78년 대오스만 전쟁의 승리로 영토를 넓혔고, ' +
      '1878년 베를린 조약으로 국제적으로 독립을 승인받았다. ' +
      '니콜라 1세 치세에 근대화가 진행되었으며 1910년 왕국으로 승격했다.',
    startEra: 'AD', startYear: 1852,
    endEra: 'AD', endYear: 1910,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.39, longitude: 18.92,
    linkToIsoCodes: ['ME'],
  },
  {
    name: '몬테네그로 왕국',
    enName: 'Kingdom of Montenegro',
    description:
      '1910년 니콜라 1세가 즉위 50주년에 왕을 칭하며 성립한 왕국. ' +
      '발칸 전쟁에 참전해 영토를 넓혔으나 1차 세계대전 중 1916년 오스트리아-헝가리군에 점령되었다. ' +
      '1918년 11월 포드고리차 의회가 니콜라 1세의 폐위와 세르비아와의 통합을 결의하면서 ' +
      '세르비아-크로아티아-슬로베니아 왕국에 흡수되어 소멸했다.',
    startEra: 'AD', startYear: 1910, startMonth: 8,
    endEra: 'AD', endYear: 1918, endMonth: 11,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.39, longitude: 18.92,
    linkToIsoCodes: ['ME'],
  },

  // ── 유고슬라비아 시대와 독립 ──────────────────────────────────────
  {
    name: '몬테네그로 사회주의 공화국',
    enName: 'Socialist Republic of Montenegro',
    description:
      '1943년 몬테네그로 반파시스트 민족해방회의(ZAVNO CG)를 기반으로 성립해 1945년 유고슬라비아 연방의 ' +
      '구성 공화국이 된 사회주의 공화국(초명은 인민공화국, 1963년 사회주의 공화국으로 개칭). ' +
      '수도는 티토그라드(현 포드고리차)였다. ' +
      '1992년 유고슬라비아 해체 국면에서 세르비아와 함께 신연방(유고슬라비아 연방 공화국)에 잔류하는 길을 택하며 재편되었다.',
    startEra: 'AD', startYear: 1943,
    endEra: 'AD', endYear: 1992,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.44, longitude: 19.26,
    linkToIsoCodes: ['ME'],
  },
  {
    name: '몬테네그로 공화국',
    enName: 'Republic of Montenegro',
    description:
      '2006년 5월 21일 독립 국민투표(찬성 55.5%)를 거쳐 6월 3일 독립을 선언하며 ' +
      '세르비아 몬테네그로 연합에서 분리된 국가. 2007년 신헌법으로 국호를 몬테네그로로 확정했다. ' +
      '2017년 나토(NATO)에 가입했으며 유럽연합(EU) 가입 협상을 진행하고 있다.',
    startEra: 'AD', startYear: 2006, startMonth: 6,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.44, longitude: 19.26,
    linkToIsoCodes: ['ME'],
  },
]

/**
 * 다른 시드가 소유한 HC에 현대 몬테네그로 연결만 보강(크로아티아·슬로베니아 시드 패턴).
 * - 유고 계열 5행: 몬테네그로가 구성 지역 — 특히 유고연방공화국(1992~2003)은 세르비아+몬테네그로
 *   2공화국 연방이고 세르비아 몬테네그로(2003~2006)는 국명에 포함
 * - 로마 공화국: BC229 제1차 일리리아 전쟁의 리존(리산) 보호령화·BC168 겐티우스 왕국 해체 후
 *   클라이언트 공화국 간접지배 / 로마 제국: 독레아 무니키피움·달마티아/프라이발리타나 속주
 * - 서로마 제국은 적대 검증에서 기각: 395 분할 시 프라이발리타나(현 ME 내륙 전역)는 다키아 관구로
 *   동로마 배속 — 서로마 행이 판노니아 HU조차 배제한 좁은 기준과 충돌
 */
const EXTRA_MODERN_LINKS: { hcName: string; isoCode: string }[] = [
  { hcName: '세르비아-크로아티아-슬로베니아 왕국', isoCode: 'ME' },
  { hcName: '유고슬라비아 왕국', isoCode: 'ME' },
  { hcName: '유고슬라비아 사회주의 연방 공화국', isoCode: 'ME' },
  { hcName: '유고슬라비아 연방 공화국', isoCode: 'ME' },
  { hcName: '세르비아 몬테네그로', isoCode: 'ME' },
  { hcName: '로마 공화국', isoCode: 'ME' },
  { hcName: '로마 제국', isoCode: 'ME' },
]

export async function seedMontenegroHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇲🇪 몬테네그로 관련 역사 국가 시딩 시작...')

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

  // 타 시드 소유 HC → 현대 몬테네그로 연결 보강
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

  console.log(`✅ 몬테네그로 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
