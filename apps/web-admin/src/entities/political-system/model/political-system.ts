/**
 * 정체(政體) 모델 — enum 한글 라벨과 기간 표기의 단일 출처.
 *
 * 국가에 붙은 붙박이 값이 아니라 기간을 가진 레코드다. 프랑스 제3·4·5공화국이 한 국가
 * 아래 세 줄로 놓인다.
 */
import type { PoliticalSystem } from '@/shared/api/political-system'

export type GovernmentForm = NonNullable<PoliticalSystem['governmentForm']>
export type LegislatureType = NonNullable<PoliticalSystem['legislatureType']>
export type StateStructure = NonNullable<PoliticalSystem['stateStructure']>
export type PartySystem = NonNullable<PoliticalSystem['partySystem']>
export type HeadSelectionMethod = NonNullable<
  PoliticalSystem['headSelectionMethod']
>
export type ElectoralSystemType = NonNullable<
  PoliticalSystem['electoralSystem']
>
export type WarPowerAuthority = NonNullable<
  PoliticalSystem['warPowerAuthority']
>

export const WAR_POWER_AUTHORITY_LABEL: Record<WarPowerAuthority, string> = {
  MONARCH_PREROGATIVE: '군주 대권 단독',
  MONARCH_WITH_UPPER_HOUSE: '군주 선포 + 상원·참의원 동의',
  LEGISLATURE_EXCLUSIVE: '의회 전속 의결',
  EXECUTIVE_WITH_LEGISLATURE_CONSENT: '행정부 선포 + 의회 동의',
  EXECUTIVE_EXCLUSIVE: '원수·행정부 단독',
  RENOUNCED: '교전권·전쟁 포기',
  OTHER: '기타·혼합',
}

export const WAR_POWER_AUTHORITY_ORDER: WarPowerAuthority[] = [
  'EXECUTIVE_WITH_LEGISLATURE_CONSENT',
  'LEGISLATURE_EXCLUSIVE',
  'MONARCH_PREROGATIVE',
  'MONARCH_WITH_UPPER_HOUSE',
  'EXECUTIVE_EXCLUSIVE',
  'RENOUNCED',
  'OTHER',
]

export const HEAD_SELECTION_METHOD_LABEL: Record<HeadSelectionMethod, string> = {
  DIRECT: '국민 직선',
  INDIRECT: '간선 (의회·선거인단)',
  HEREDITARY: '세습·왕위 계승',
  APPOINTED: '임명·지명',
  COUP_OR_JUNTA: '군사집권·추대',
  OTHER: '기타',
}

export const HEAD_SELECTION_METHOD_ORDER: HeadSelectionMethod[] = [
  'DIRECT',
  'INDIRECT',
  'HEREDITARY',
  'APPOINTED',
  'COUP_OR_JUNTA',
  'OTHER',
]

export const ELECTORAL_SYSTEM_TYPE_LABEL: Record<ElectoralSystemType, string> = {
  FPTP: '소선거구 단순다수제',
  TWO_ROUND: '결선투표제',
  PARALLEL: '병립형 (지역구+비례)',
  MMP: '연동형 비례대표제',
  PARTY_LIST_PR: '정당명부 비례대표제',
  SNTV_MMDP: '중·대선거구 단기비이양식',
  STV: '단기이양식',
  INDIRECT_ELECTORAL: '간선·선거인단·직능선출',
  OTHER: '기타',
}

export const ELECTORAL_SYSTEM_TYPE_ORDER: ElectoralSystemType[] = [
  'PARALLEL',
  'FPTP',
  'MMP',
  'PARTY_LIST_PR',
  'TWO_ROUND',
  'SNTV_MMDP',
  'STV',
  'INDIRECT_ELECTORAL',
  'OTHER',
]

export const GOVERNMENT_FORM_LABEL: Record<GovernmentForm, string> = {
  PRESIDENTIAL: '대통령제',
  PARLIAMENTARY: '의원내각제',
  SEMI_PRESIDENTIAL: '이원집정부제',
  CONSTITUTIONAL_MONARCHY: '입헌군주제',
  ABSOLUTE_MONARCHY: '절대군주제',
  MILITARY: '군사정권',
  ONE_PARTY: '일당제 국가',
  THEOCRACY: '신정',
  PROVISIONAL: '과도정부',
  OTHER: '기타',
}

/** 폼 드롭다운 순서 — 흔한 것부터 */
export const GOVERNMENT_FORM_ORDER: GovernmentForm[] = [
  'PRESIDENTIAL',
  'PARLIAMENTARY',
  'SEMI_PRESIDENTIAL',
  'CONSTITUTIONAL_MONARCHY',
  'ABSOLUTE_MONARCHY',
  'MILITARY',
  'ONE_PARTY',
  'THEOCRACY',
  'PROVISIONAL',
  'OTHER',
]

export const LEGISLATURE_TYPE_LABEL: Record<LegislatureType, string> = {
  UNICAMERAL: '단원제',
  BICAMERAL: '양원제',
  NONE: '의회 없음',
}

export const LEGISLATURE_TYPE_ORDER: LegislatureType[] = [
  'UNICAMERAL',
  'BICAMERAL',
  'NONE',
]

export const STATE_STRUCTURE_LABEL: Record<StateStructure, string> = {
  FEDERAL: '연방제',
  UNITARY: '단일국가',
  CONFEDERATION: '국가연합',
  OTHER: '기타',
}

export const STATE_STRUCTURE_ORDER: StateStructure[] = [
  'UNITARY',
  'FEDERAL',
  'CONFEDERATION',
  'OTHER',
]

export const PARTY_SYSTEM_LABEL: Record<PartySystem, string> = {
  ONE_PARTY: '일당제',
  TWO_PARTY: '양당제',
  MULTI_PARTY: '다당제',
  NON_PARTISAN: '무정당',
  OTHER: '기타',
}

export const PARTY_SYSTEM_ORDER: PartySystem[] = [
  'MULTI_PARTY',
  'TWO_PARTY',
  'ONE_PARTY',
  'NON_PARTISAN',
  'OTHER',
]

/**
 * 단원제일 때 lowerHouse*는 '하원'이 아니라 그냥 '의회'다.
 * 한 쌍의 컬럼을 두 뜻으로 쓰므로 라벨은 항상 이 함수를 거친다.
 */
export function primaryHouseLabel(type: LegislatureType | null): string {
  return type === 'BICAMERAL' ? '하원' : '의회'
}

/** BC는 음수. 정렬·비교는 반드시 이 값으로 — 원시 연도는 BC를 뒤집는다. */
export function toSignedYear(
  era: 'BC' | 'AD' | string | null | undefined,
  year: number | null | undefined,
): number | null {
  if (year == null || !Number.isFinite(year)) return null
  return era === 'BC' ? -Math.abs(year) : year
}

/**
 * 연·월·일을 부호 정수 키(YYYYMMDD)로 변환한다.
 * 월·일이 비어 있으면 구간 시작(start)은 01-01, 끝(end)은 12-31로 보정해
 * 같은 해에 헌정 체제가 교체된 경우(예: 1960년 제1→제2공화국, 1958년 프랑스 제4→제5공화국)도 정확히 가른다.
 */
export function toSignedDateKey(
  era: 'BC' | 'AD' | string | null | undefined,
  year: number | null | undefined,
  month?: number | null,
  day?: number | null,
  edge: 'start' | 'end' = 'start',
): number | null {
  const signed = toSignedYear(era, year)
  if (signed == null) return null
  const m =
    month != null && Number.isFinite(month) && month >= 1 && month <= 12
      ? Math.trunc(month)
      : edge === 'end'
        ? 12
        : 1
  const d =
    day != null && Number.isFinite(day) && day >= 1 && day <= 31
      ? Math.trunc(day)
      : edge === 'end'
        ? 31
        : 1
  return signed * 10000 + m * 100 + d
}

/** ISO / YYYY-MM-DD / BC 문자열을 부호 정수 키(YYYYMMDD)로 변환 */
export function parseIsoOrYmdToDateKey(
  raw: string | null | undefined,
  edge: 'start' | 'end' = 'start',
): number | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const bcMatch = /^BC\s*(\d{1,6})(?:[-./](\d{1,2}))?(?:[-./](\d{1,2}))?/i.exec(
    trimmed,
  )
  if (bcMatch) {
    return toSignedDateKey(
      'BC',
      Number(bcMatch[1]),
      bcMatch[2] ? Number(bcMatch[2]) : null,
      bcMatch[3] ? Number(bcMatch[3]) : null,
      edge,
    )
  }
  const isoMatch = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(trimmed)
  if (!isoMatch) return null
  const parsedYear = Number(isoMatch[1])
  if (!Number.isFinite(parsedYear) || parsedYear === 0) return null
  return toSignedDateKey(
    parsedYear < 0 ? 'BC' : 'AD',
    Math.abs(parsedYear),
    isoMatch[2] ? Number(isoMatch[2]) : null,
    isoMatch[3] ? Number(isoMatch[3]) : null,
    edge,
  )
}

const yearText = (era: 'BC' | 'AD' | null, year: number | null) =>
  year == null ? null : era === 'BC' ? `기원전 ${year}` : `${year}`

/** '1870–1940' · '1958–현재' · '기원전 52–기원전 27' · '연도 미상' */
export function formatPeriod(system: PoliticalSystem): string {
  const start = yearText(system.startEra, system.startYear)
  const end = yearText(system.endEra, system.endYear)
  if (start == null && end == null) return '연도 미상'
  if (start != null && end == null) {
    return system.isCurrent ? `${start}–현재` : `${start}–`
  }
  if (start == null && end != null) return `–${end}`
  return `${start}–${end}`
}

/**
 * '상원 상원'·'의회 국민의회'처럼 라벨과 이름이 겹칠 때 이름만 남긴다.
 * 원 이름이 이미 그 역할을 말하고 있으면 라벨을 앞에 붙이는 게 군더더기다.
 */
export function houseText(label: string, name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return label
  return trimmed.includes(label) ? trimmed : `${label} ${trimmed}`
}

/** 한 줄 요약 — '대통령제 · 양원제' */
export function summarize(system: PoliticalSystem): string {
  const parts = [
    system.governmentForm && GOVERNMENT_FORM_LABEL[system.governmentForm],
    system.legislatureType && LEGISLATURE_TYPE_LABEL[system.legislatureType],
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '내용 없음'
}

/** 목록 정렬 — 오래된 순(연·월·일), 연도 미상은 끝. */
export function comparePoliticalSystems(
  left: PoliticalSystem,
  right: PoliticalSystem,
): number {
  const leftYear = toSignedYear(left.startEra, left.startYear)
  const rightYear = toSignedYear(right.startEra, right.startYear)
  if (leftYear == null && rightYear == null) return 0
  if (leftYear == null) return 1
  if (rightYear == null) return -1
  if (leftYear !== rightYear) return leftYear - rightYear
  const leftMonth = left.startMonth ?? 1
  const rightMonth = right.startMonth ?? 1
  if (leftMonth !== rightMonth) return leftMonth - rightMonth
  return (left.startDay ?? 1) - (right.startDay ?? 1)
}

/**
 * 지금의 정체 하나를 고른다.
 *
 * `isCurrent`가 진실의 원천이다 — 종료 연도가 비어 있는 것과 "아직 지속 중"은 다른
 * 뜻이라 이 필드를 따로 둔다. 그런 줄이 여럿이면(과거 국가 정체가 브리지로 함께 올 때
 * 생긴다) 시작이 가장 늦은 줄을 고르고, 하나도 없으면 시작이 가장 늦은 줄로 떨어진다 —
 * 아무 표시가 없는 나라에서도 요약 한 줄은 나와야 한다.
 */
export function resolveCurrentSystem(
  systems: PoliticalSystem[],
  options?: { preferModernDirect?: boolean },
): PoliticalSystem | null {
  if (systems.length === 0) return null
  const sorted = [...systems].sort(comparePoliticalSystems)
  if (options?.preferModernDirect) {
    const modernDirect = sorted.filter(
      (system) => !system.historicalCountryId,
    )
    if (modernDirect.length > 0) {
      const modernCurrent = modernDirect.filter((system) => system.isCurrent)
      const modernPool =
        modernCurrent.length > 0 ? modernCurrent : modernDirect
      return modernPool[modernPool.length - 1] ?? null
    }
  }
  const current = sorted.filter((system) => system.isCurrent)
  const pool = current.length > 0 ? current : sorted
  return pool[pool.length - 1] ?? null
}

/**
 * 국가원수·정부수반 직함 — **관직 정의 카탈로그가 정본**이다.
 *
 * 화면은 반드시 이 함수를 거친다. 자유입력 칸을 직접 읽으면 카탈로그에서 고른 직함이
 * 빈칸으로 보인다(백필 이후 실DB 14행 중 13행이 FK 쪽에 있다). 카탈로그에 없는 칭호
 * ('연합회의 의장'·'임시정부 수반')만 자유입력으로 남는다.
 */
export function headOfStateTitleOf(system: PoliticalSystem): string | null {
  return system.headOfStatePosition?.title ?? system.headOfStateTitle ?? null
}

export function headOfGovernmentTitleOf(
  system: PoliticalSystem,
): string | null {
  return (
    system.headOfGovernmentPosition?.title ??
    system.headOfGovernmentTitle ??
    null
  )
}

export interface PoliticalSystemDateQuery {
  countryId?: string | null
  historicalCountryId?: string | null
  era?: 'BC' | 'AD' | string | null
  year?: number | null
  month?: number | null
  day?: number | null
  /** 'YYYY-MM-DD' 또는 ISO 날짜 문자열 (era/year 미지정 시 파싱) */
  isoDate?: string | null
  /** 날짜 미지정 또는 매칭 실패 시 현행(isCurrent) 정체로 폴백할지 여부 (기본 false) */
  fallbackToCurrent?: boolean
}

/**
 * 특정 시점(연·월·일)과 정치체 스코프에 해당하는 활성 정체(`PoliticalSystem`) 1건을 찾는다.
 *
 * - 연도만이 아니라 `YYYYMMDD` 부호 정수 키 구간으로 대조해 같은 해의 체제 전환도 정확히 구분한다.
 * - `historicalCountryId`가 주어지면 해당 역사국가 소속 정체를 최우선하고,
 *   현대국가 화면에서 과거 날짜를 입력해 현대 직접 정체에는 없고 연결 역사국가 정체에만 해당 시기가 있으면
 *   그 역사국가 정체까지 자연스럽게 찾아준다.
 */
export function findPoliticalSystemAtDate(
  systems: readonly PoliticalSystem[],
  query: PoliticalSystemDateQuery,
): PoliticalSystem | null {
  if (systems.length === 0) return null

  const sorted = [...systems].sort(comparePoliticalSystems)
  const queryStartKey =
    query.year != null
      ? toSignedDateKey(query.era, query.year, query.month, query.day, 'start')
      : parseIsoOrYmdToDateKey(query.isoDate, 'start')
  const queryEndKey =
    query.year != null
      ? toSignedDateKey(query.era, query.year, query.month, query.day, 'end')
      : parseIsoOrYmdToDateKey(query.isoDate, 'end')

  const directScoped = sorted.filter((sys) => {
    if (query.historicalCountryId) {
      return sys.historicalCountryId === query.historicalCountryId
    }
    if (query.countryId) {
      return sys.countryId === query.countryId && !sys.historicalCountryId
    }
    return true
  })

  const matchesDateRange = (sys: PoliticalSystem): boolean => {
    if (queryStartKey == null || queryEndKey == null) return false
    const sysStart = toSignedDateKey(
      sys.startEra,
      sys.startYear,
      sys.startMonth,
      sys.startDay,
      'start',
    )
    const sysEnd = toSignedDateKey(
      sys.endEra,
      sys.endYear,
      sys.endMonth,
      sys.endDay,
      'end',
    )
    if (sysStart == null && sysEnd == null) return false
    if (sysStart != null && queryEndKey < sysStart) return false
    if (sysEnd != null && queryStartKey > sysEnd) return false
    return true
  }

  if (queryStartKey != null && queryEndKey != null) {
    const directDateHits = directScoped.filter(matchesDateRange)
    if (directDateHits.length > 0) {
      return directDateHits[directDateHits.length - 1] ?? null
    }
    // 현대국가 스코프에서 과거 연도 입력 시 브리지로 함께 내려온 역사국가 정체 매칭 허용
    if (!query.historicalCountryId) {
      const bridgeHits = sorted.filter(matchesDateRange)
      if (bridgeHits.length > 0) {
        return bridgeHits[bridgeHits.length - 1] ?? null
      }
    }
  }

  if (!query.fallbackToCurrent) return null

  const fallbackPool = directScoped.length > 0 ? directScoped : sorted
  const current = fallbackPool.filter((sys) => sys.isCurrent)
  if (current.length > 0) return current[current.length - 1] ?? null
  return fallbackPool[fallbackPool.length - 1] ?? null
}

/** 정체 배너용 요약 문자열 — 예: '제6공화국 · 대통령제 · 단원제 · 다당제' */
export function formatPoliticalSystemContextSummary(
  system: PoliticalSystem,
): string {
  const parts = [
    system.name?.trim() || null,
    system.governmentForm ? GOVERNMENT_FORM_LABEL[system.governmentForm] : null,
    system.legislatureType ? LEGISLATURE_TYPE_LABEL[system.legislatureType] : null,
    system.partySystem ? PARTY_SYSTEM_LABEL[system.partySystem] : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

/**
 * 역사국가(`HistoricalCountry.stateType`)로부터 첫 정체 등록 시 추천할 기본 정부 형태·국가 구조를 추론한다.
 */
export function presetFromHistoricalStateType(
  stateType: string | null | undefined,
): {
  governmentForm?: GovernmentForm
  stateStructure?: StateStructure
  legislatureType?: LegislatureType
} {
  if (!stateType) return {}
  switch (stateType) {
    case 'EMPIRE':
    case 'KINGDOM':
    case 'PRINCIPALITY':
    case 'ELECTORATE':
    case 'MARGRAVIATE':
    case 'SULTANATE':
    case 'KHANATE':
    case 'NOMADIC_EMPIRE':
    case 'DYNASTY':
    case 'HEREDITARY':
      return { governmentForm: 'ABSOLUTE_MONARCHY' }
    case 'THEOCRACY':
    case 'CALIPHATE':
      return { governmentForm: 'THEOCRACY' }
    case 'SHOGUNATE':
    case 'MILITARY_JUNTA':
      return { governmentForm: 'MILITARY' }
    case 'PROVISIONAL_GOVERNMENT':
    case 'PROVISIONAL':
      return { governmentForm: 'PROVISIONAL' }
    case 'FEDERATION':
      return { stateStructure: 'FEDERAL' }
    case 'CONFEDERATION':
      return { stateStructure: 'CONFEDERATION' }
    default:
      return {}
  }
}

export type EffectivePowerHolderRole =
  | 'HEAD_OF_STATE'
  | 'HEAD_OF_GOVERNMENT'
  | 'DUAL_EXECUTIVE'

/**
 * `headOfStateHasPower`·`headOfGovernmentHasPower` 플래그(정본)와 `governmentForm` 폴백으로
 * 해당 헌정 체제의 실질 행정권 보유 주체를 판별한다.
 * - 역대 수장 타임라인의 "실권 수반 기준 보기" 및 대시보드 대표 수반 정렬에 사용한다.
 */
export function resolveEffectivePowerHolderRole(
  system: Pick<
    PoliticalSystem,
    'headOfStateHasPower' | 'headOfGovernmentHasPower' | 'governmentForm'
  >,
): EffectivePowerHolderRole {
  const statePower = system.headOfStateHasPower
  const govPower = system.headOfGovernmentHasPower

  if (statePower === true && govPower === true) return 'DUAL_EXECUTIVE'
  if (govPower === true && statePower !== true) return 'HEAD_OF_GOVERNMENT'
  if (statePower === true && govPower !== true) return 'HEAD_OF_STATE'

  switch (system.governmentForm) {
    case 'PARLIAMENTARY':
    case 'CONSTITUTIONAL_MONARCHY':
      return 'HEAD_OF_GOVERNMENT'
    case 'SEMI_PRESIDENTIAL':
      return 'DUAL_EXECUTIVE'
    default:
      return 'HEAD_OF_STATE'
  }
}

/**
 * 헌법상 임기 시작일('YYYY-MM-DD')과 법정 임기(년)로 예정 임기 만료일('YYYY-MM-DD')을 계산한다.
 * 예: '2024-05-30' + 4년 -> '2028-05-29'
 */
export function addTermYearsToIsoDate(
  startYmd: string | null | undefined,
  termYears: number | null | undefined,
): string | null {
  if (!startYmd || !termYears || !Number.isInteger(termYears) || termYears < 1) {
    return null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startYmd.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  // UTC 기준으로 N년 뒤 같은 날짜에서 하루를 빼 만료일을 산출 (윤년 2.29 -> 2.28 안전 처리)
  const anniversaryUtc = new Date(Date.UTC(year + termYears, month - 1, day))
  if (anniversaryUtc.getUTCMonth() !== month - 1) {
    // 2월 29일 시작 + 평년 종료 시 해당 월 말일 기준
    anniversaryUtc.setUTCDate(0)
    const yyyy = String(anniversaryUtc.getUTCFullYear()).padStart(4, '0')
    const mm = String(anniversaryUtc.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(anniversaryUtc.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  anniversaryUtc.setUTCDate(anniversaryUtc.getUTCDate() - 1)
  const yyyy = String(anniversaryUtc.getUTCFullYear()).padStart(4, '0')
  const mm = String(anniversaryUtc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(anniversaryUtc.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export interface SystemHeadPositionSlot {
  axis: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  positionId: string | null
  title: string
  isMonarchical: boolean
  hasPower: boolean
}

const MONARCH_TITLE_RE =
  /^(국왕|황제|여왕|천황|군주|대공|공작|술탄|칼리프|파라오|차르|샤|칸|가한|태왕|왕|친왕|교황)$/

function isSlotMonarchical(
  posRef: PoliticalSystem['headOfStatePosition'] | null | undefined,
  title: string,
  govForm: GovernmentForm | null | undefined,
  axis: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT',
): boolean {
  if (posRef && typeof posRef.isMonarchical === 'boolean') {
    return posRef.isMonarchical
  }
  if (MONARCH_TITLE_RE.test(title.trim())) return true
  if (
    axis === 'HEAD_OF_STATE' &&
    (govForm === 'ABSOLUTE_MONARCHY' || govForm === 'CONSTITUTIONAL_MONARCHY')
  ) {
    return !/대통령|주석|총통|의장/.test(title.trim())
  }
  return false
}

/**
 * 정체(PoliticalSystem)에 등록된 공식 국가원수·정부수반 슬롯을 추출한다.
 * 행정부 등록(CabinetFormModal)·인물 재임/재위 등록(TenureRegisterPanel)·역대 수반 연표가 모두 이 정본을 따른다.
 */
export function resolveSystemHeadPositionSlots(
  system: PoliticalSystem | null | undefined,
): {
  stateSlot: SystemHeadPositionSlot | null
  governmentSlot: SystemHeadPositionSlot | null
  primaryCabinetSlot: SystemHeadPositionSlot | null
  secondaryCabinetSlot: SystemHeadPositionSlot | null
  monarchSlot: SystemHeadPositionSlot | null
} {
  if (!system) {
    return {
      stateSlot: null,
      governmentSlot: null,
      primaryCabinetSlot: null,
      secondaryCabinetSlot: null,
      monarchSlot: null,
    }
  }

  const hosTitle =
    system.headOfStatePosition?.title?.trim() ||
    system.headOfStateTitle?.trim() ||
    ''
  const hogTitle =
    system.headOfGovernmentPosition?.title?.trim() ||
    system.headOfGovernmentTitle?.trim() ||
    ''

  const stateSlot: SystemHeadPositionSlot | null = hosTitle
    ? {
        axis: 'HEAD_OF_STATE',
        positionId:
          system.headOfStatePosition?.id ?? system.headOfStatePositionId ?? null,
        title: hosTitle,
        isMonarchical: isSlotMonarchical(
          system.headOfStatePosition,
          hosTitle,
          system.governmentForm,
          'HEAD_OF_STATE',
        ),
        hasPower: system.headOfStateHasPower ?? true,
      }
    : null

  const governmentSlot: SystemHeadPositionSlot | null = hogTitle
    ? {
        axis: 'HEAD_OF_GOVERNMENT',
        positionId:
          system.headOfGovernmentPosition?.id ??
          system.headOfGovernmentPositionId ??
          null,
        title: hogTitle,
        isMonarchical: false,
        hasPower: system.headOfGovernmentHasPower ?? true,
      }
    : null

  const monarchSlot = stateSlot?.isMonarchical ? stateSlot : null

  const form = system.governmentForm ?? null
  if (form === 'ABSOLUTE_MONARCHY') {
    return {
      stateSlot,
      governmentSlot,
      primaryCabinetSlot: stateSlot ?? governmentSlot,
      secondaryCabinetSlot: stateSlot && governmentSlot ? governmentSlot : null,
      monarchSlot,
    }
  }
  if (
    form === 'PRESIDENTIAL' ||
    (stateSlot?.hasPower === true && governmentSlot?.hasPower === false)
  ) {
    return {
      stateSlot,
      governmentSlot,
      primaryCabinetSlot: stateSlot ?? governmentSlot,
      secondaryCabinetSlot: stateSlot && governmentSlot ? governmentSlot : null,
      monarchSlot,
    }
  }
  if (
    form === 'PARLIAMENTARY' ||
    form === 'CONSTITUTIONAL_MONARCHY' ||
    form === 'SEMI_PRESIDENTIAL'
  ) {
    const nonMonarchState = stateSlot && !stateSlot.isMonarchical ? stateSlot : null
    return {
      stateSlot,
      governmentSlot,
      primaryCabinetSlot: governmentSlot ?? nonMonarchState ?? stateSlot,
      secondaryCabinetSlot:
        governmentSlot && nonMonarchState ? nonMonarchState : null,
      monarchSlot,
    }
  }

  const nonMonarchState = stateSlot && !stateSlot.isMonarchical ? stateSlot : null
  const first =
    (governmentSlot?.hasPower ? governmentSlot : null) ??
    (nonMonarchState?.hasPower ? nonMonarchState : null) ??
    governmentSlot ??
    nonMonarchState ??
    stateSlot
  const second =
    first === governmentSlot
      ? nonMonarchState
      : first === nonMonarchState
        ? governmentSlot
        : null

  return {
    stateSlot,
    governmentSlot,
    primaryCabinetSlot: first,
    secondaryCabinetSlot: second,
    monarchSlot,
  }
}

/**
 * 정체의 원수 선출방식(headSelectionMethod) 및 정부형태(governmentForm)로부터
 * 재임·재위 기록의 기본 취임·선출 방식(AppointmentMethod)을 도출한다.
 */
export function defaultAppointmentMethodFromSystem(
  system: PoliticalSystem | null | undefined,
  axis: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT',
): string {
  if (!system) return ''
  const form = system.governmentForm ?? null
  if (axis === 'HEAD_OF_GOVERNMENT') {
    if (form === 'PARLIAMENTARY' || form === 'CONSTITUTIONAL_MONARCHY') {
      return 'PARLIAMENTARY_ELECTION'
    }
    if (
      form === 'SEMI_PRESIDENTIAL' ||
      form === 'ABSOLUTE_MONARCHY' ||
      form === 'ONE_PARTY' ||
      form === 'THEOCRACY' ||
      form === 'PROVISIONAL' ||
      form === 'MILITARY'
    ) {
      return 'APPOINTMENT'
    }
    return ''
  }

  switch (system.headSelectionMethod) {
    case 'DIRECT':
      return 'DIRECT_ELECTION'
    case 'INDIRECT':
      return form === 'PARLIAMENTARY'
        ? 'PARLIAMENTARY_ELECTION'
        : 'INDIRECT_ELECTION'
    case 'HEREDITARY':
      return 'HEREDITARY'
    case 'APPOINTED':
      return 'APPOINTMENT'
    case 'COUP_OR_JUNTA':
      return 'COUP'
    default:
      break
  }

  if (form === 'PRESIDENTIAL' || form === 'SEMI_PRESIDENTIAL') {
    return 'DIRECT_ELECTION'
  }
  if (form === 'CONSTITUTIONAL_MONARCHY' || form === 'ABSOLUTE_MONARCHY') {
    return 'HEREDITARY'
  }
  if (form === 'PARLIAMENTARY') {
    return 'PARLIAMENTARY_ELECTION'
  }
  if (form === 'MILITARY') {
    return 'COUP'
  }
  return ''
}

/**
 * 의회의원(LEGISLATOR) 등록 시 정체에 등록된 원(Chamber) 중 기본 선택할 원 ID를 반환한다.
 */
export function defaultChamberIdForLegislator(
  system: PoliticalSystem | null | undefined,
  positionTitle?: string | null,
): string | null {
  if (!system || system.legislatureType === 'NONE') return null
  if (system.legislatureType === 'UNICAMERAL') {
    return system.lowerChamberId ?? null
  }
  const normalized = (positionTitle ?? '').trim()
  if (
    /상원|참의원|원로원|귀족원|연방참의원|Senate|House of Lords/i.test(normalized)
  ) {
    return system.upperChamberId ?? system.lowerChamberId ?? null
  }
  if (
    /하원|중의원|서민원|대의원|국민의회|연방의회|국회|House of Representatives|House of Commons/i.test(
      normalized,
    )
  ) {
    return system.lowerChamberId ?? system.upperChamberId ?? null
  }
  return system.lowerChamberId ?? system.upperChamberId ?? null
}

/**
 * 법령(Law) 등록 시 정체에 등록된 기본 의결 원(단원제 유일원 또는 양원제 제1원/하원) ID를 반환한다.
 */
export function defaultPassedChamberIdFromSystem(
  system: PoliticalSystem | null | undefined,
): string | null {
  if (!system || system.legislatureType === 'NONE') return null
  return system.lowerChamberId ?? system.upperChamberId ?? null
}

/**
 * 조약(Treaty) 서명·비준 등록 시 정체에 따른 기본 비준 의회 원 ID를 반환한다.
 * (단원제는 유일원, 대통령제 양원제는 상원 우선, 그 외 양원제는 하원 우선)
 */
export function defaultTreatyRatifiedChamberIdFromSystem(
  system: PoliticalSystem | null | undefined,
): string | null {
  if (!system || system.legislatureType === 'NONE') return null
  if (system.legislatureType === 'UNICAMERAL') {
    return system.lowerChamberId ?? null
  }
  if (system.governmentForm === 'PRESIDENTIAL') {
    return system.upperChamberId ?? system.lowerChamberId ?? null
  }
  return system.lowerChamberId ?? system.upperChamberId ?? null
}

export type PoliticalSystemIntegrityIssueKind =
  | 'PERIOD_OVERLAP'
  | 'CONSTITUTIONAL_GAP'
  | 'MISSING_UPPER_CHAMBER'
  | 'MISSING_LOWER_CHAMBER'
  | 'UNLINKED_HEAD_POSITION'
  | 'MISSING_HEAD_POSITION'
  | 'UNCOVERED_RECORDS'

export interface PoliticalSystemIntegrityIssue {
  kind: PoliticalSystemIntegrityIssueKind
  severity: 'warning' | 'info'
  title: string
  detail: string
  systemIds?: string[]
}

/**
 * 국가 헌정 연표(`PoliticalSystem[]`)와 선거·내각 기록 사이의 데이터 정합성을 진단한다.
 */
export function diagnosePoliticalSystemsIntegrity(params: {
  systems: readonly PoliticalSystem[]
  electionDates?: ReadonlyArray<{
    id: string
    name: string
    pollDate?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
  }>
  cabinetDates?: ReadonlyArray<{
    id: string
    name?: string | null
    politicalSystemId?: string | null
    startDate?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
  }>
}): PoliticalSystemIntegrityIssue[] {
  const issues: PoliticalSystemIntegrityIssue[] = []
  const { systems, electionDates = [], cabinetDates = [] } = params
  if (systems.length === 0) return issues

  // 1) 개별 체제 내 양원제/단원제 원 누락 점검
  for (const sys of systems) {
    const label = sys.name?.trim() || formatPeriod(sys) || '이름 없는 체제'
    if (
      sys.legislatureType === 'BICAMERAL' &&
      !sys.upperChamberId &&
      !sys.upperHouseName?.trim()
    ) {
      issues.push({
        kind: 'MISSING_UPPER_CHAMBER',
        severity: 'warning',
        title: `양원제 상원 미지정 (${label})`,
        detail: `'${label}' 체제가 양원제로 설정되어 있으나 상원(원 카탈로그 또는 명칭)이 비어 있습니다.`,
        systemIds: [sys.id],
      })
    }
    if (
      (sys.legislatureType === 'UNICAMERAL' ||
        sys.legislatureType === 'BICAMERAL') &&
      !sys.lowerChamberId
    ) {
      issues.push({
        kind: 'MISSING_LOWER_CHAMBER',
        severity: 'info',
        title: `원(Chamber) 정본 미연결 (${label})`,
        detail: `'${label}' 체제에 의회 원(Chamber) 카탈로그를 연결하면 선거·의원 재임·법령이 원 단위로 자동 연동됩니다.`,
        systemIds: [sys.id],
      })
    }
    if (
      (sys.headOfStateTitle?.trim() && !sys.headOfStatePositionId) ||
      (sys.headOfGovernmentTitle?.trim() && !sys.headOfGovernmentPositionId)
    ) {
      issues.push({
        kind: 'UNLINKED_HEAD_POSITION',
        severity: 'warning',
        title: `수반 직함 카탈로그 미연결 (${label})`,
        detail: `'${label}' 체제의 수반 직함이 관직 정의(카탈로그) 대신 수기 문자열로 저장되어 있습니다. 정체 수정을 열어 정식 수반 카테고리로 연결해 주세요.`,
        systemIds: [sys.id],
      })
    } else if (
      sys.governmentForm &&
      !sys.headOfStatePositionId &&
      !sys.headOfGovernmentPositionId
    ) {
      issues.push({
        kind: 'MISSING_HEAD_POSITION',
        severity: 'info',
        title: `공식 수반 직위 미지정 (${label})`,
        detail: `'${label}' 체제에 국가원수·정부수반 직위 카테고리를 등록해 두면 행정부·수반 추가 시 기본 직책이 자동으로 세팅됩니다.`,
        systemIds: [sys.id],
      })
    }
  }

  // 2) 동일 정치체 축별로 묶어 기간 겹침 / 공백 구간 검사
  const byPolity = new Map<string, PoliticalSystem[]>()
  for (const sys of systems) {
    const polityKey = sys.historicalCountryId
      ? `hist:${sys.historicalCountryId}`
      : `mod:${sys.countryId ?? 'global'}`
    const bucket = byPolity.get(polityKey) ?? []
    bucket.push(sys)
    byPolity.set(polityKey, bucket)
  }

  for (const group of byPolity.values()) {
    const dated = group
      .filter((sys) => sys.startYear != null)
      .sort(comparePoliticalSystems)
    for (let idx = 0; idx < dated.length - 1; idx += 1) {
      const prev = dated[idx]!
      const next = dated[idx + 1]!
      const prevLabel = prev.name?.trim() || formatPeriod(prev)
      const nextLabel = next.name?.trim() || formatPeriod(next)

      const prevEndKey = toSignedDateKey(
        prev.endEra,
        prev.endYear,
        prev.endMonth,
        prev.endDay,
        'end',
      )
      const nextStartKey = toSignedDateKey(
        next.startEra,
        next.startYear,
        next.startMonth,
        next.startDay,
        'start',
      )

      // 이전 체제가 종료일 없이 열려 있는데 다음 체제가 시작된 경우 또는 종료일이 다음 시작일보다 뒤인 경우
      // (단, 같은 날 교대 prevEndKey === nextStartKey 또는 연도 단위 동년 교체는 제외)
      const bothYearOnly =
        prev.endMonth == null && next.startMonth == null
      const sameYearHandoff =
        bothYearOnly &&
        prev.endYear != null &&
        next.startYear != null &&
        prev.endEra === next.startEra &&
        prev.endYear === next.startYear

      if (prev.endYear == null && !prev.isCurrent) {
        issues.push({
          kind: 'PERIOD_OVERLAP',
          severity: 'warning',
          title: `종료 연도 누락 (${prevLabel})`,
          detail: `'${prevLabel}' 이후 '${nextLabel}' 체제가 이어지지만 이전 체제의 종료 시점이 비어 있습니다.`,
          systemIds: [prev.id, next.id],
        })
      } else if (
        prevEndKey != null &&
        nextStartKey != null &&
        !sameYearHandoff &&
        prevEndKey > nextStartKey
      ) {
        issues.push({
          kind: 'PERIOD_OVERLAP',
          severity: 'warning',
          title: `헌정 기간 중복 (${prevLabel} ↔ ${nextLabel})`,
          detail: `'${prevLabel}' 종료 시점이 '${nextLabel}' 출범 시점보다 뒤에 있어 두 체제 기간이 겹칩니다.`,
          systemIds: [prev.id, next.id],
        })
      } else if (prev.endYear != null && next.startYear != null) {
        const prevSignedYear =
          (prev.endEra === 'BC' ? -1 : 1) * prev.endYear
        const nextSignedYear =
          (next.startEra === 'BC' ? -1 : 1) * next.startYear
        const yearGap = nextSignedYear - prevSignedYear
        if (yearGap >= 2) {
          issues.push({
            kind: 'CONSTITUTIONAL_GAP',
            severity: 'info',
            title: `헌정 연표 공백 (${prev.endYear}~${next.startYear})`,
            detail: `'${prevLabel}' 종료 후 '${nextLabel}' 출범 전까지 약 ${yearGap - 1}년의 미등록 구간이 있습니다.`,
            systemIds: [prev.id, next.id],
          })
        }
      }
    }
  }

  // 3) 선거·내각 중 매칭 정체가 없는 연도 집계
  const uncoveredYears = new Set<number>()
  for (const election of electionDates) {
    if (!election.pollDate) continue
    const matched = findPoliticalSystemAtDate(systems, {
      countryId: election.countryId,
      historicalCountryId: election.historicalCountryId,
      isoDate: election.pollDate,
      fallbackToCurrent: false,
    })
    if (!matched) {
      const yearMatch = /^(-?\d{1,4})/.exec(election.pollDate.trim())
      if (yearMatch) uncoveredYears.add(Number(yearMatch[1]))
    }
  }
  for (const cab of cabinetDates) {
    if (cab.politicalSystemId) continue
    if (!cab.startDate) continue
    const matched = findPoliticalSystemAtDate(systems, {
      countryId: cab.countryId,
      historicalCountryId: cab.historicalCountryId,
      isoDate: cab.startDate,
      fallbackToCurrent: false,
    })
    if (!matched) {
      const yearMatch = /^(-?\d{1,4})/.exec(cab.startDate.trim())
      if (yearMatch) uncoveredYears.add(Number(yearMatch[1]))
    }
  }
  if (uncoveredYears.size > 0) {
    const sortedYears = [...uncoveredYears].sort((a, b) => a - b)
    const preview = sortedYears
      .slice(0, 5)
      .map((yr) => (yr < 0 ? `BC ${Math.abs(yr)}년` : `${yr}년`))
      .join(', ')
    const extra =
      sortedYears.length > 5 ? ` 외 ${sortedYears.length - 5}개 연도` : ''
    issues.push({
      kind: 'UNCOVERED_RECORDS',
      severity: 'info',
      title: `정체 미매칭 선거·내각 존재 (${sortedYears.length}개 연도)`,
      detail: `${preview}${extra}에 치러진 선거 또는 출범한 내각을 포괄하는 헌정 체제가 등록되어 있지 않습니다.`,
    })
  }

  return issues
}
