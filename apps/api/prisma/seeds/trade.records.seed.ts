/**
 * 교역 기록 시드 — 카탈로그가 실제로 어떻게 쓰이는지 보여주는 최소 정본.
 *
 * ## 숫자를 다루는 원칙
 *
 * 이 도메인에서 가장 쉬운 사고는 **그럴듯한 금액을 지어내는 것**이다. 그래서 여기서는
 * 확실한 것만 금액으로 넣고, 나머지는 **비중·품목 구성만** 남긴다. 스키마가 애초에
 * "금액 없이 비중만 아는 자료가 흔하다"를 전제로 설계돼 있어 그대로 담긴다.
 *
 * - 대한민국 2024 — 산업통상자원부·관세청 발표 확정치. `confidence: HIGH`
 * - 대영제국 1913 · 조선 1890 — 구성(무엇을·누구와·대략의 비중)은 경제사에서 널리
 *   합의된 그림이지만 **금액은 추계마다 갈린다**. 그래서 총액을 비우고 비중만 적었고,
 *   `isEstimate: true` + `confidence: LOW`로 표시한다. 정확한 금액은 출처를 들고 온
 *   사람이 채울 자리다.
 *
 * ## 멱등
 * (주체 · era · year)가 이미 있으면 **건드리지 않고 넘어간다**. 사용자가 화면에서
 * 고친 값을 시드 재실행이 덮어쓰면 안 된다.
 */
import { PrismaService } from '../prisma.service'

type Direction = 'EXPORT' | 'IMPORT'

interface FlowSeed {
  direction: Direction
  /**
   * 단면. 생략하면 상대 유무로 추론한다.
   * 상대국별 행(품목 무관)은 이름 칸에 상대명이 들어가 추론이 PARTNER_COMMODITY로
   * 잘못 떨어지므로 **반드시 명시**한다 — 품목별 행과 더하면 이중계산이다.
   */
  grain?: 'COMMODITY' | 'PARTNER' | 'PARTNER_COMMODITY'
  /** 카탈로그 품목명 (trade_commodity.name) — 못 찾으면 자유 입력으로 떨어진다 */
  commodity?: string
  /** 카탈로그에 없는 품목을 그대로 적을 때 */
  name?: string
  /** 상대 — 역사 국가명 */
  partnerHistorical?: string
  /** 상대 — 현대 국가 ISO 코드 */
  partnerIso?: string
  /** 상대 — 자유 표기 */
  partnerLabel?: string
  value?: number
  sharePct?: number
  quantity?: number
  quantityUnit?: string
  rankInDirection?: number
  channel?: string
  restriction?: string
  transportMode?: string
  routeName?: string
  portName?: string
  isReExport?: boolean
  isEstimate?: boolean
  notes?: string
}

interface RecordSeed {
  /** 주체 — 역사 국가명 */
  historicalCountry?: string
  /** 주체 — 현대 국가 ISO 코드 */
  countryIso?: string
  era: 'AD' | 'BC'
  year: number
  exportValue?: number
  importValue?: number
  currencyCode?: string
  valueScale?: 'ONE' | 'THOUSAND' | 'MILLION' | 'BILLION' | 'TRILLION'
  priceBasis?: string
  sourceName?: string
  isEstimate?: boolean
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  note?: string
  flows: FlowSeed[]
}

const RECORDS: RecordSeed[] = [
  // ── 대한민국 2024 — 확정 발표치 ────────────────────────────
  {
    countryIso: 'KR',
    era: 'AD',
    year: 2024,
    exportValue: 683.8,
    importValue: 632.0,
    currencyCode: 'USD',
    valueScale: 'BILLION',
    priceBasis: 'FOB',
    sourceName: '산업통상자원부·관세청 연간 수출입 동향',
    confidence: 'HIGH',
    note: '통관 기준 확정치. 수출은 FOB, 수입은 CIF가 원자료 기준이라 두 숫자의 가격 기준이 서로 다르다.',
    flows: [
      { direction: 'EXPORT', commodity: '반도체', sharePct: 20.8, value: 141.9, rankInDirection: 1 },
      { direction: 'EXPORT', commodity: '승용차', sharePct: 10.4, value: 70.8, rankInDirection: 2 },
      { direction: 'EXPORT', commodity: '석유제품', sharePct: 7.4, value: 50.7, rankInDirection: 3 },
      { direction: 'EXPORT', commodity: '선박', sharePct: 3.7, value: 25.6 },
      { direction: 'IMPORT', commodity: '원유', sharePct: 12.5, value: 79.1, rankInDirection: 1 },
      { direction: 'IMPORT', commodity: '반도체', sharePct: 8.3, value: 52.5, rankInDirection: 2 },
      { direction: 'IMPORT', commodity: '천연가스', sharePct: 4.6, value: 29.0 },
    ],
  },

  // ── 미국 2022·2023·2024 — 상품 교역 ───────────────────────
  //
  // 세 해를 넣는 이유: 한 해만 있으면 대시보드 추이선이 그려지지 않는다(점 하나는
  // 추세가 아니다). 총액은 상품(goods) 기준으로 통일했다 — 품목·상대 비중이 모두
  // 상품 통계라서, 서비스를 총액에만 섞으면 분모와 분자가 어긋난다.
  {
    countryIso: 'US',
    era: 'AD',
    year: 2022,
    exportValue: 2085.4,
    importValue: 3277.0,
    currencyCode: 'USD',
    valueScale: 'BILLION',
    sourceName: 'BEA·미 상무부 센서스국 상품 교역 통계',
    confidence: 'MEDIUM',
    note: '상품(goods) 기준. 서비스 교역은 별도이며 미국은 서비스에서 흑자다.',
    flows: [],
  },
  {
    countryIso: 'US',
    era: 'AD',
    year: 2023,
    exportValue: 2045.2,
    importValue: 3105.5,
    currencyCode: 'USD',
    valueScale: 'BILLION',
    sourceName: 'BEA·미 상무부 센서스국 상품 교역 통계',
    confidence: 'MEDIUM',
    note: '상품(goods) 기준. 이 해에 멕시코가 중국을 제치고 최대 수입 상대가 됐다.',
    flows: [],
  },
  {
    countryIso: 'US',
    era: 'AD',
    year: 2024,
    exportValue: 2065.0,
    importValue: 3296.6,
    currencyCode: 'USD',
    valueScale: 'BILLION',
    priceBasis: 'FOB',
    sourceName: 'BEA·미 상무부 센서스국 상품 교역 통계',
    confidence: 'HIGH',
    note: '상품(goods) 기준 — 총액은 확정 발표치다. 아래 품목·상대 비중은 대략의 그림이라 행마다 추정으로 표시했다. 서비스를 합치면 적자 폭이 크게 줄어든다(미국은 서비스 흑자국).',
    flows: [
      /*
       * 품목별 — 상대를 가리지 않은 단면(COMMODITY).
       * 총액은 확정치지만 품목 비중은 반올림한 근사라 행마다 추정으로 표시한다.
       */
      { direction: 'EXPORT', commodity: '원유', sharePct: 5.7, rankInDirection: 1, transportMode: 'SEA', isEstimate: true, notes: '2015년 원유 수출 금지가 풀린 뒤 미국은 최대 산유국이자 주요 수출국이 됐다.' },
      { direction: 'EXPORT', commodity: '항공기', sharePct: 5.0, rankInDirection: 2, transportMode: 'AIR', isEstimate: true },
      { direction: 'EXPORT', commodity: '의약품', sharePct: 4.6, rankInDirection: 3, isEstimate: true },
      { direction: 'EXPORT', commodity: '석유제품', sharePct: 4.1, transportMode: 'SEA', isEstimate: true },
      { direction: 'EXPORT', commodity: '천연가스', sharePct: 3.1, transportMode: 'SEA', isEstimate: true, notes: 'LNG 수출은 2022년 이후 유럽의 러시아산 대체 수요로 커졌다.' },
      { direction: 'EXPORT', commodity: '반도체', sharePct: 2.9, isEstimate: true },
      { direction: 'EXPORT', commodity: '승용차', sharePct: 2.9, isEstimate: true },
      { direction: 'EXPORT', commodity: '콩', sharePct: 1.2, isEstimate: true },

      { direction: 'IMPORT', commodity: '승용차', sharePct: 6.7, rankInDirection: 1, isEstimate: true },
      { direction: 'IMPORT', commodity: '의약품', sharePct: 6.5, rankInDirection: 2, isEstimate: true, notes: '2024년 의약품 수입이 크게 늘었다 — 아일랜드발 물량이 큰 몫이다.' },
      { direction: 'IMPORT', commodity: '자동차부품', sharePct: 5.8, rankInDirection: 3, isEstimate: true },
      { direction: 'IMPORT', commodity: '원유', sharePct: 5.2, transportMode: 'PIPELINE', isEstimate: true, notes: '캐나다산 중질유가 파이프라인으로 들어온다 — 미국은 최대 산유국이면서 동시에 큰 수입국이다.' },
      { direction: 'IMPORT', commodity: '컴퓨터', sharePct: 4.6, isEstimate: true },
      { direction: 'IMPORT', commodity: '휴대전화', sharePct: 3.0, isEstimate: true },

      /*
       * 상대국별 — 품목을 가리지 않은 단면(PARTNER).
       * 위의 품목별 행과 **더하면 안 된다**. 같은 무역을 두 번 세게 된다.
       * 캐나다는 아직 국가 테이블에 없어 자유 표기로 적었다(그 칸의 용도다).
       */
      { direction: 'EXPORT', grain: 'PARTNER', name: '캐나다', partnerLabel: '캐나다', sharePct: 17.3, isEstimate: true },
      { direction: 'EXPORT', grain: 'PARTNER', name: '멕시코', partnerIso: 'MX', sharePct: 16.2, isEstimate: true },
      { direction: 'EXPORT', grain: 'PARTNER', name: '중국', partnerIso: 'CN', sharePct: 6.7, isEstimate: true },
      { direction: 'IMPORT', grain: 'PARTNER', name: '멕시코', partnerIso: 'MX', sharePct: 15.5, rankInDirection: 1, isEstimate: true, notes: '2023년부터 중국을 제치고 최대 수입 상대가 됐다.' },
      { direction: 'IMPORT', grain: 'PARTNER', name: '중국', partnerIso: 'CN', sharePct: 13.4, rankInDirection: 2, isEstimate: true },
      { direction: 'IMPORT', grain: 'PARTNER', name: '캐나다', partnerLabel: '캐나다', sharePct: 12.6, rankInDirection: 3, isEstimate: true },
    ],
  },

  // ── 대영제국 1913 — 구성만 (금액은 추계마다 갈려 비움) ──────
  {
    historicalCountry: '대영제국',
    era: 'AD',
    year: 1913,
    isEstimate: true,
    confidence: 'LOW',
    sourceName: '경제사 개설서의 통상적 서술 (금액 미기재)',
    note: '1차대전 직전 교역 구성. 비중은 대략의 그림이며 금액은 넣지 않았다 — 추계마다 크게 갈리므로 출처를 확인한 사람이 채울 자리다. 상품수지 적자를 해운·금융 같은 보이지 않는 수입이 메우던 구조였다.',
    flows: [
      { direction: 'EXPORT', commodity: '면직물', sharePct: 24, rankInDirection: 1, partnerHistorical: undefined, partnerLabel: '인도·극동', transportMode: 'SEA', isEstimate: true, notes: '랭커셔 면업의 최대 시장이 인도였다.' },
      { direction: 'EXPORT', commodity: '석탄', sharePct: 10, rankInDirection: 2, transportMode: 'SEA', isEstimate: true, notes: '증기선 급탄지 확보가 해군기지 배치를 결정했다.' },
      { direction: 'EXPORT', commodity: '강철', sharePct: 7, transportMode: 'SEA', isEstimate: true },
      { direction: 'EXPORT', commodity: '공작기계', sharePct: 6, transportMode: 'SEA', isEstimate: true },
      /* 비중을 0으로 두면 화면에 "0%"가 찍혀 '없다'로 읽힌다 — 모르면 비운다 */
      { direction: 'EXPORT', commodity: '해운', isEstimate: true, notes: '상품 통계에는 안 잡히지만 국제수지에서는 큰 항목이었다. 상품 비중과 같은 축에 놓을 수 없어 비중을 비워 둔다.' },
      { direction: 'IMPORT', commodity: '밀', sharePct: 12, rankInDirection: 1, transportMode: 'SEA', isEstimate: true },
      { direction: 'IMPORT', commodity: '면화', sharePct: 10, rankInDirection: 2, transportMode: 'SEA', isEstimate: true },
      { direction: 'IMPORT', commodity: '양모', sharePct: 5, transportMode: 'SEA', isEstimate: true },
      { direction: 'IMPORT', commodity: '목재', sharePct: 4, transportMode: 'SEA', isEstimate: true },
    ],
  },

  // ── 조선 1890 — 개항기 구성 ────────────────────────────────
  {
    historicalCountry: '조선',
    era: 'AD',
    year: 1890,
    isEstimate: true,
    confidence: 'LOW',
    sourceName: '개항기 무역사 개설서의 통상적 서술 (금액 미기재)',
    note: '개항 이후 대일 편중이 굳은 시기. 곡물을 내주고 면제품을 들여오는 구조였고, 그 면제품 상당수는 영국산을 일본 상인이 중계한 재수출이었다. 비중은 대략의 그림이며 금액은 넣지 않았다.',
    flows: [
      { direction: 'EXPORT', commodity: '쌀', sharePct: 40, rankInDirection: 1, partnerHistorical: '일본 제국', channel: 'OFFICIAL', transportMode: 'SEA', portName: '부산', isEstimate: true, notes: '방곡령 분쟁의 배경.' },
      { direction: 'EXPORT', commodity: '콩', sharePct: 20, rankInDirection: 2, partnerHistorical: '일본 제국', transportMode: 'SEA', portName: '인천', isEstimate: true },
      { direction: 'EXPORT', commodity: '가죽', sharePct: 8, partnerHistorical: '일본 제국', transportMode: 'SEA', isEstimate: true },
      { direction: 'EXPORT', commodity: '인삼', sharePct: 3, partnerHistorical: '청나라', channel: 'PRIVATE', transportMode: 'LAND', routeName: '연행로', portName: '의주', isEstimate: true, notes: '개성상인 자본 축적의 바탕.' },
      { direction: 'IMPORT', commodity: '면직물', sharePct: 55, rankInDirection: 1, partnerHistorical: '일본 제국', isReExport: true, transportMode: 'SEA', portName: '부산', isEstimate: true, notes: '영국산 옥양목을 일본 상인이 중계한 물량이 큰 몫이었다 — 일본을 생산지로 세면 안 된다.' },
      { direction: 'IMPORT', commodity: '석유제품', sharePct: 8, partnerHistorical: '일본 제국', isReExport: true, transportMode: 'SEA', isEstimate: true, notes: '미국산 등유의 중계.' },
      { direction: 'IMPORT', name: '성냥', sharePct: 3, partnerHistorical: '일본 제국', transportMode: 'SEA', isEstimate: true, notes: '카탈로그에 없는 품목을 자유 입력으로 적은 예.' },
    ],
  },
]

export async function seedTradeRecords(prisma: PrismaService): Promise<void> {
  console.log('\n🚢 교역 기록 시딩 시작...')

  const commodities = await prisma.tradeCommodity.findMany({
    select: { id: true, name: true, categoryId: true },
  })
  const commodityByName = new Map(commodities.map((row) => [row.name, row]))

  const historicalCountries = await prisma.historicalCountry.findMany({
    select: { id: true, name: true },
  })
  const historicalByName = new Map(
    historicalCountries.map((row) => [row.name, row.id]),
  )

  const countries = await prisma.country.findMany({
    select: { id: true, isoCode: true },
  })
  const countryByIso = new Map(
    countries
      .filter((row): row is { id: string; isoCode: string } => !!row.isoCode)
      .map((row) => [row.isoCode, row.id]),
  )

  let created = 0
  let skipped = 0

  for (const record of RECORDS) {
    const countryId = record.countryIso
      ? (countryByIso.get(record.countryIso) ?? null)
      : null
    const historicalCountryId = record.historicalCountry
      ? (historicalByName.get(record.historicalCountry) ?? null)
      : null

    const label = record.historicalCountry ?? record.countryIso ?? '?'
    if (!countryId && !historicalCountryId) {
      console.log(`  ⏭️  주체를 찾을 수 없어 건너뜀: ${label} ${record.year}`)
      skipped++
      continue
    }

    /* 사용자가 화면에서 고친 값을 시드가 덮어쓰면 안 된다 — 있으면 그대로 둔다 */
    const existing = await prisma.exportImport.findFirst({
      where: {
        countryId,
        historicalCountryId,
        era: record.era,
        year: record.year,
      },
      select: { id: true },
    })
    if (existing) {
      console.log(`  ⏭️  이미 있음: ${label} ${record.year}`)
      skipped++
      continue
    }

    const parent = await prisma.exportImport.create({
      data: {
        countryId,
        historicalCountryId,
        era: record.era,
        year: record.year,
        exportValue: record.exportValue ?? null,
        importValue: record.importValue ?? null,
        currencyCode: record.currencyCode ?? null,
        valueScale: (record.valueScale ?? 'ONE') as never,
        priceBasis: (record.priceBasis ?? null) as never,
        sourceName: record.sourceName ?? null,
        isEstimate: record.isEstimate ?? false,
        confidence: (record.confidence ?? null) as never,
        note: record.note ?? null,
      },
    })

    const flowData = record.flows.map((flow, index) => {
      const commodity = flow.commodity
        ? commodityByName.get(flow.commodity)
        : undefined
      if (flow.commodity && !commodity) {
        throw new Error(`카탈로그에 없는 품목: ${flow.commodity}`)
      }
      const name = flow.name ?? commodity?.name
      if (!name) throw new Error(`품목명이 없는 흐름: ${label} ${record.year}`)

      const partnerHistoricalCountryId = flow.partnerHistorical
        ? (historicalByName.get(flow.partnerHistorical) ?? null)
        : null
      const partnerCountryId = flow.partnerIso
        ? (countryByIso.get(flow.partnerIso) ?? null)
        : null
      const hasPartner =
        partnerHistoricalCountryId != null ||
        partnerCountryId != null ||
        flow.partnerLabel != null

      return {
        exportImportId: parent.id,
        direction: flow.direction as never,
        /* 명시가 있으면 그대로, 없으면 상대 유무로 갈린다 */
        grain: (flow.grain ??
          (hasPartner ? 'PARTNER_COMMODITY' : 'COMMODITY')) as never,
        commodityId: commodity?.id ?? null,
        name,
        categoryId: commodity?.categoryId ?? null,
        partnerCountryId,
        partnerHistoricalCountryId,
        partnerLabel: flow.partnerLabel ?? null,
        value: flow.value ?? null,
        sharePct: flow.sharePct ?? null,
        quantity: flow.quantity ?? null,
        quantityUnit: flow.quantityUnit ?? null,
        rankInDirection: flow.rankInDirection ?? null,
        channel: (flow.channel ?? null) as never,
        restriction: (flow.restriction ?? null) as never,
        transportMode: (flow.transportMode ?? null) as never,
        routeName: flow.routeName ?? null,
        portName: flow.portName ?? null,
        isReExport: flow.isReExport ?? false,
        isEstimate: flow.isEstimate ?? false,
        notes: flow.notes ?? null,
        sortOrder: index,
      }
    })

    await prisma.exportImportItem.createMany({ data: flowData })
    console.log(`  ✅ ${label} ${record.year} — 흐름 ${flowData.length}건`)
    created++
  }

  console.log(`🚢 교역 기록 시딩 완료 (신규 ${created} · 건너뜀 ${skipped})`)
}
