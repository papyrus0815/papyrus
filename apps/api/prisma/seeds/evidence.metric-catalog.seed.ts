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
import { MetricAggregation, MetricDimension, MetricValueKind } from '@prisma/client'

import { PrismaService } from '../prisma.service'

interface MetricSeed {
  key: string
  name: string
  domain: string
  valueKind: MetricValueKind
  aggregation: MetricAggregation
  unit?: string
  definition: string
  /** 추가 차원 — 'CHAMBER'면 측정값마다 원 필수 */
  dimension?: MetricDimension
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
    key: 'military.deaths_unspecified',
    name: '군 사망(정의 미상)',
    domain: 'military',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '원자료가 전사·전상사·질병 사망을 구분하지 않은 군 사망. 정의가 확인되면 해당 지표로 옮긴다 — ' +
      '정의가 다른 숫자를 같은 지표로 비교하지 않기 위한 칸이다.',
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
    key: 'military.tanks',
    name: '전차',
    domain: 'military',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'tank',
    definition: '투입된 전차·돌격포 등 장갑 전투차량 수(장갑차·수송차량 제외). 정의가 다르면 메모에 밝힌다.',
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
    definition: '전쟁·무력 충돌·진압 등으로 인한 비전투 민간인 사망. 전투원 사망과 구분될 때 쓴다.',
  },
  {
    key: 'civilian.wounded',
    name: '민간인 부상',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition: '전쟁·무력 충돌·진압 등으로 인한 비전투 민간인 부상. 전투원 부상과 구분될 때 쓴다.',
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
  // ── 재해 ──────────────────────────────────────────────────
  // 사회 사건 중 지진·대화재(안세이 지진 3건, 긴자 대화재)의 규모를 담을 칸이 없었다
  // (docs/event-category-features-review.md §3 사회). 인명 피해는 civilian.* 를 그대로 쓴다.
  // ⚠️ sortOrder가 배열 순서라 새 지표는 끝에 덧붙인다(중간에 넣으면 뒤 지표 순서가 전부 밀린다).
  {
    key: 'disaster.magnitude',
    name: '지진 규모',
    domain: 'disaster',
    valueKind: MEASURE,
    aggregation: MAX,
    unit: 'M',
    definition:
      '지진이 방출한 에너지의 크기 — 모멘트 규모(Mw), 기록이 없으면 리히터 규모(ML). 지점마다 다른 흔들림 정도인 진도와 다르다.',
  },
  {
    key: 'disaster.buildings_destroyed',
    name: '파괴된 건물',
    domain: 'disaster',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'building',
    definition: '전파·전소된 건물 수(반파 제외). 가옥 수로 기록된 경우 그대로 센다.',
  },
  // ── 봉기·진압·학살 추가 지표 (sortOrder 유지를 위해 끝에 추가) ──
  {
    key: 'human.executed',
    name: '처형·학살 사망',
    domain: 'civilian',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '포로·체포자·민간인이 전투 밖에서 처형·학살·피살된 사망자 수. 교전 중 사망(전사)과 구분될 때 따로 적는다.',
  },
  {
    key: 'society.arrested',
    name: '체포·구금 인원',
    domain: 'society',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '진압·숙청·탄압 등으로 체포·구금·기소된 인원. 전투 포로(military.captured)가 아닌 시위대·봉기자·시민 대상.',
  },
  // ── 정당 (docs/political-party-model-review.md §4.9 — sortOrder 유지를 위해 끝에 추가) ──
  {
    key: 'party.members',
    name: '당원 수',
    domain: 'politics',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition:
      '그 시점에 당적을 가진 인원. 당 공식 발표와 연구자 추산이 자주 갈린다 — 산출 방식(공식 발표·추정)과 채택/대안으로 구분해 나란히 적는다.',
  },
  {
    key: 'party.branches',
    name: '지부 수',
    domain: 'politics',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'branch',
    definition: '그 시점의 당 지역 조직(지부·지구당·세포) 수. 어느 단위를 셌는지는 단서(qualifier)에 적는다.',
  },
  {
    key: 'party.income',
    name: '당 재정 수입',
    domain: 'politics',
    valueKind: MONEY,
    aggregation: NONE,
    definition: '한 해(또는 적은 기간)의 당 수입 — 당비·기부·국고 보조 합계. 기간은 측정값의 시작·끝으로 적는다.',
  },
  {
    key: 'party.seats',
    name: '의석 수',
    domain: 'politics',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'seat',
    dimension: MetricDimension.CHAMBER,
    definition:
      '그 시점에 이 정당이 어느 원(院)에서 가진 의석. 선거 집계로 못 담는 경우(임명직 상원·탈당·보궐·단일 명부 신임 투표)용 — 원은 필수 차원, 정원은 원의 정원 이력에서 읽는다.',
  },
  // ── 보편 인명·치안 지표 (시위·유혈 충돌·테러·재해·범죄·사고 공통 — sortOrder 유지를 위해 끝에 추가) ──
  {
    key: 'human.deaths',
    name: '사망자',
    domain: 'human',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '사건으로 인한 사망자 수(시위·유혈 충돌·테러·재해·범죄·사고 등 군·민 구분 없이 집계된 사망 포함). 정규군 전사자나 민간인 사망이 별도로 나뉠 때만 세부 지표를 쓴다.',
  },
  {
    key: 'human.wounded',
    name: '부상자',
    domain: 'human',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '사건으로 인한 부상자 수(시위·유혈 충돌·테러·재해·범죄·사고 등 생존 부상자). 정규군 전투 부상자와 구분될 때만 군 부상자를 따로 쓴다.',
  },
  {
    key: 'human.missing',
    name: '실종자',
    domain: 'human',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '사건·재해·사고·충돌로 행방불명된 인원(정규군 작전 실종자는 military.missing).',
  },
  {
    key: 'human.casualties',
    name: '사상자 합계',
    domain: 'human',
    valueKind: COUNT,
    aggregation: SUM,
    unit: 'person',
    definition:
      '사망·부상·실종이 사료에서 구분되지 않고 합산으로만 전해지는 인명 피해 총수. 구성 단서는 qualifier에 적는다.',
  },
  {
    key: 'security.personnel',
    name: '경찰·치안 병력',
    domain: 'society',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'person',
    definition:
      '시위 진압·치안 유지·검거 등에 투입된 경찰·헌병·경비대·준군사 행동대 인원(정규군 작전 병력은 military.personnel).',
  },
  // ── 군사 사령부·부대 정원·실병력·인원 구성·편제 장비 정수 (sortOrder 유지를 위해 끝에 추가) ──
  {
    key: 'military.unit.authorized_wartime',
    name: '전시 완편 정원',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition:
      '동원·전시 편제표(TO&E / KStN 등)상 부대에 인가된 완편 병력 정원. 실제 보유 병력(실병력)과 구분해 적는다.',
  },
  {
    key: 'military.unit.authorized_peacetime',
    name: '평시 편제 정원',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition:
      '평시 상비 편제표상 부대에 인가된 정원.',
  },
  {
    key: 'military.unit.actual_strength',
    name: '실병력(현원)',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition:
      '특정 시점에 부대가 실제로 보유한 현원 병력(손실·미충원 반영). 시점은 측정값의 start로 기록한다.',
  },
  {
    key: 'military.unit.officers',
    name: '장교',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition: '부대 편제 정원 또는 현원 중 장교(장성·영관·위관) 인원.',
  },
  {
    key: 'military.unit.ncos',
    name: '부사관',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition: '부대 편제 정원 또는 현원 중 부사관(하사관·준사관 포함) 인원.',
  },
  {
    key: 'military.unit.enlisted',
    name: '병(사병)',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition: '부대 편제 정원 또는 현원 중 병사 인원.',
  },
  {
    key: 'military.unit.combat_personnel',
    name: '전투병력',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'person',
    definition: '보병·기갑·수색 등 일선 전투원 수(후방 지원·보급·행정 인원과 구분될 때 기록).',
  },
  {
    key: 'military.unit.sub_units_count',
    name: '예하 편제 수',
    domain: 'military',
    valueKind: COUNT,
    aggregation: LATEST,
    unit: 'unit',
    definition: '산하 주력 제대(사단·여단·연대·대대·비행대·전대 등) 수. 제대 단위는 단서(qualifier)에 명시한다.',
  },
  {
    key: 'military.afv',
    name: '장갑차·보병전투차',
    domain: 'military',
    valueKind: COUNT,
    aggregation: MAX,
    unit: 'afv',
    definition: '반궤도·차륜형 장갑차(APC), 보병전투차(IFV), 장갑수색차량 등 비전차 장갑전투차량 수.',
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
      dimension: metric.dimension ?? null,
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
