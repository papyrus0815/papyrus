/**
 * 지표 카탈로그 + 역사 통화 시드 — 측정값(Observation)이 고르는 두 목록.
 *
 * 설계: docs/event-detail-data-foundation.md D3.
 *
 * **정의가 다르면 다른 지표다.** 기존 casualties_data 10행은 같은 '사망' 칸에
 * '전사'(전투 중 사망) · '전사·전상사' · '질병 포함 총사망'을 섞어 담았고, 그래서 진영끼리
 * 비교하면 정의가 다른 숫자를 나란히 놓게 됐다(크림 전쟁: 러시아 14만 vs 동맹국 7만은 둘 다
 * 전사+전상사지만, 같은 사건의 총사망 45만·30만은 질병 포함). 키를 정의 단위로 나눈다.
 *
 * 통화: ISO 4217에 있는 역사 통화(NLG·FRF)는 그 코드를, 없는 것(탈러·은량·굴덴·금마르크)은
 * `H-` 접두 코드를 쓴다. 금액 측정값은 반드시 통화를 가진다(ObservationService).
 *
 * 멱등: 지표는 key, 통화는 code 기준 upsert.
 */
import { MetricAggregation, MetricValueKind } from '@prisma/client'

import { PrismaService } from '../prisma.service'

interface MetricSeed {
  key: string
  name: string
  domain: string
  valueKind: MetricValueKind
  aggregation: MetricAggregation
  unit?: string
  definition: string
}

const { COUNT, MONEY, RATIO, INDEX, MEASURE } = MetricValueKind
const { SUM, MAX, LATEST, NONE } = MetricAggregation

const METRICS: MetricSeed[] = [
  // ── 군사 인명 ──────────────────────────────────────────────
  {
    key: 'military.killed_in_action',
    name: '군 전사자',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '전투 중 사망. 전상 후 사망·질병 사망은 포함하지 않는다.',
  },
  {
    key: 'military.combat_deaths',
    name: '군 전투 사망(전사+전상사)',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '전투 중 사망 + 전투 부상으로 인한 사후 사망. 질병 사망 제외.',
  },
  {
    key: 'military.deaths_total',
    name: '군 총사망',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '복무 중 모든 사망 — 전투·전상·질병·사고 포함.',
  },
  {
    key: 'military.wounded',
    name: '군 부상자',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '전투 부상자(생존).',
  },
  {
    key: 'military.missing',
    name: '군 실종자',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '행방 불명. 이후 포로·사망으로 확인된 인원은 해당 지표로 옮긴다.',
  },
  {
    key: 'military.captured',
    name: '포로',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '적에게 사로잡힌 군 인원.',
  },
  {
    key: 'military.casualties_total',
    name: '군 손실 합계',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '사망 + 부상 + 실종 + 포로. 구성 정의는 측정값의 단서(qualifier)에 적는다.',
  },
  // ── 군사 동원 ──────────────────────────────────────────────
  {
    key: 'military.personnel',
    name: '동원 병력',
    domain: 'military',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'person',
    definition: '작전·전쟁에 동원된 병력(최대 시점).',
  },
  {
    key: 'military.vessels',
    name: '동원 함선',
    domain: 'military',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'vessel',
    definition: '작전에 투입된 함선 수.',
  },
  {
    key: 'military.aircraft',
    name: '동원 항공기',
    domain: 'military',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'aircraft',
    definition: '작전에 투입된 유인 항공기 수.',
  },
  {
    key: 'military.artillery',
    name: '화포',
    domain: 'military',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'gun',
    definition: '투입된 대포·화포 수.',
  },
  {
    key: 'military.missiles_launched',
    name: '미사일·로켓 발사',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'munition',
    definition: '발사된 탄도·순항 미사일과 로켓 수.',
  },
  {
    key: 'military.drones_launched',
    name: '무인기 발사',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'drone',
    definition: '발사된 공격용 무인기(자폭 드론 포함) 수.',
  },
  {
    key: 'military.sorties',
    name: '출격',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'sortie',
    definition: '항공기 출격 횟수.',
  },
  // ── 민간 ──────────────────────────────────────────────────
  {
    key: 'civilian.killed',
    name: '민간인 사망',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '군사 행동으로 인한 민간인 사망.',
  },
  {
    key: 'civilian.wounded',
    name: '민간인 부상',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '군사 행동으로 인한 민간인 부상.',
  },
  {
    key: 'civilian.displaced',
    name: '피난·이재민',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '거주지를 떠난 인원(국내 실향 + 국외 난민).',
  },
  {
    key: 'civilian.enslaved',
    name: '노예화·강제 이송',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '포획되어 노예가 되거나 강제로 이송된 민간인.',
  },
  {
    key: 'human.deaths_total',
    name: '총사망(군+민)',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '군·민간을 합친 모든 사망 — 질병·기근 포함.',
  },
  // ── 경제 ──────────────────────────────────────────────────
  {
    key: 'economy.war_expenditure',
    name: '전비',
    domain: 'economy',
    valueKind: MONEY,
    aggregation: SUM,
    definition: '전쟁·작전 수행에 쓴 국가 지출.',
  },
  {
    key: 'economy.indemnity',
    name: '배상금',
    domain: 'economy',
    valueKind: MONEY,
    aggregation: SUM,
    definition: '조약·합의로 지불이 정해진 배상금 총액.',
  },
  {
    key: 'economy.capital',
    name: '자본금',
    domain: 'economy',
    valueKind: MONEY,
    aggregation: LATEST,
    definition: '설립·증자 시점의 납입 자본.',
  },
  {
    key: 'economy.market_cap',
    name: '시가총액',
    domain: 'economy',
    valueKind: MONEY,
    aggregation: LATEST,
    definition: '발행 지분 전체의 시장 가치.',
  },
  {
    key: 'economy.deposits',
    name: '예금 잔액',
    domain: 'economy',
    valueKind: MONEY,
    aggregation: LATEST,
    definition: '금융기관이 보유한 예금 총액.',
  },
  {
    key: 'economy.loss',
    name: '경제 손실',
    domain: 'economy',
    valueKind: MONEY,
    aggregation: SUM,
    definition: '파괴·몰수·교역 중단 등으로 인한 손실 추정.',
  },
  {
    key: 'economy.index_close',
    name: '지수 종가',
    domain: 'economy',
    valueKind: INDEX,
    aggregation: LATEST,
    unit: 'point',
    definition: '주가지수 등의 장 마감 값.',
  },
  {
    key: 'economy.interest_rate',
    name: '금리',
    domain: 'economy',
    valueKind: RATIO,
    aggregation: NONE,
    unit: 'percent',
    definition: '연율 금리(%).',
  },
  {
    key: 'economy.return_rate',
    name: '수익률',
    domain: 'economy',
    valueKind: RATIO,
    aggregation: NONE,
    unit: 'percent',
    definition: '투자 원금 대비 수익 비율(%).',
  },
  // ── 사회·인구 ──────────────────────────────────────────────
  {
    key: 'society.participants',
    name: '참여 인원',
    domain: 'society',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '사건에 직접 참여한 인원(시위대·출자자·대표단 등). 누구인지는 단서에 적는다.',
  },
  {
    key: 'demography.population',
    name: '인구',
    domain: 'demography',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition: '해당 시점 인구.',
  },
  // ── 영토 ──────────────────────────────────────────────────
  {
    key: 'territory.area_ceded',
    name: '할양 면적',
    domain: 'territory',
    valueKind: MEASURE,
    aggregation: SUM,
    unit: 'km2',
    definition: '조약·점령으로 주권이 넘어간 면적.',
  },
]

interface CurrencySeed {
  code: string
  name: string
  symbol: string
}

const HISTORICAL_CURRENCIES: CurrencySeed[] = [
  { code: 'NLG', name: '네덜란드 길더', symbol: 'ƒ' },
  { code: 'FRF', name: '프랑스 프랑', symbol: '₣' },
  { code: 'H-THALER', name: '탈러(프로이센 등)', symbol: 'Tlr' },
  { code: 'H-ATGULD', name: '오스트리아 굴덴', symbol: 'fl.' },
  { code: 'H-GMARK', name: '독일 금마르크(1873–1914)', symbol: 'ℳ' },
  { code: 'H-TAEL', name: '은량(청)', symbol: '兩' },
  { code: 'H-DUCAT', name: '두카트', symbol: 'duc.' },
]

export async function seedEvidenceMetricCatalog(prisma: PrismaService): Promise<void> {
  console.log('\n📏 지표 카탈로그 시딩 시작...')
  let created = 0
  let updated = 0
  for (const [index, metric] of METRICS.entries()) {
    const data = {
      name: metric.name,
      domain: metric.domain,
      valueKind: metric.valueKind,
      aggregation: metric.aggregation,
      unit: metric.unit ?? null,
      definition: metric.definition,
      sortOrder: index,
      isSystem: true,
    }
    const existing = await prisma.metricDefinition.findUnique({
      where: { key: metric.key },
      select: { id: true },
    })
    if (existing) {
      await prisma.metricDefinition.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.metricDefinition.create({ data: { key: metric.key, ...data } })
      created++
    }
  }
  console.log(`  ✅ 지표 신규 ${created} · 갱신 ${updated} (총 ${METRICS.length})`)

  let currencyCreated = 0
  for (const currency of HISTORICAL_CURRENCIES) {
    const existing = await prisma.currency.findUnique({
      where: { code: currency.code },
      select: { id: true },
    })
    if (existing) continue
    await prisma.currency.create({ data: currency })
    currencyCreated++
  }
  console.log(`  ✅ 역사 통화 신규 ${currencyCreated} (목록 ${HISTORICAL_CURRENCIES.length})`)
}
