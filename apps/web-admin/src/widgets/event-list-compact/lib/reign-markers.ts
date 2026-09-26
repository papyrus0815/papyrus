/**
 * 군주 즉위 구분선 — 사건 목록의 연대 흐름 사이에 '👑 세종 즉위 · 조선 · 재위 1418–1450'을
 * 끼워 넣기 위한 순수 계산.
 *
 * 날짜는 전부 `부호연도×10000 + 월×100 + 일` 정수 키로 비교한다(iso-date의 dateSortKey와
 * 같은 규약). 네이티브 Date는 BC·연도<100에서 부호 소실/오연도를 내므로 쓰지 않는다.
 * 정밀도가 낮은 즉위일은 그 해(또는 달)의 **첫날**로, 퇴위일은 **마지막 날**로 본다.
 */
import { getCentury, parseIsoDateParts } from '@/shared/lib/iso-date'

/** 'BC' | 'AD' — 서버 enum 문자열 */
type EraValue = string | null | undefined

/** `GET /government-positions/sovereign-reigns` 항목 중 여기서 쓰는 필드 */
export interface SovereignReignTimelineItem {
  id: string
  personId: string
  countryId?: string | null
  historicalCountryId?: string | null
  regnalName?: string | null
  notes?: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  startEra?: EraValue
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endDate?: string | null
  endDatePrecision?: string | null
  endEra?: EraValue
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  country?: { id: string; name?: string | null } | null
  historicalCountry?: { id: string; name?: string | null } | null
  person?: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    regnalName?: string | null
    templeName?: string | null
    isAlive?: boolean | null
    deathDate?: string | null
    deathDatePrecision?: string | null
    deathEra?: EraValue
  } | null
}

export interface ReignMarker {
  /** 재위 기록 id */
  id: string
  personId: string
  /** 표시명 — 재위명 > 왕명(notes) > 인물 재위명 > 묘호 > 인물 표시명 */
  name: string
  countryName: string | null
  /** 즉위 시점 키(포함 하한) */
  startKey: number
  /** 부호 연도 — BC는 음수 */
  startYear: number
  /** 즉위 월·일 — 정밀도가 연/월이면 null */
  startMonth: number | null
  startDay: number | null
  /** 퇴위 연도 — 현직·미상이면 null */
  endYear: number | null
}

interface DateParts {
  year: number
  month: number | null
  day: number | null
}

const signedYear = (year: number, era: EraValue) =>
  era === 'BC' ? -Math.abs(year) : year

/**
 * 구조화 축(Era/Year/Month/Day)이 우선, 없으면 DATETIME 컬럼.
 * 정밀도가 'year'/'month'면 모르는 부분은 null로 돌려 호출부가 채우게 한다.
 */
function resolveParts(
  era: EraValue,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  iso: string | null | undefined,
  precision: string | null | undefined,
): DateParts | null {
  const dropMonth = precision === 'year'
  const dropDay = precision === 'year' || precision === 'month'
  if (year != null) {
    return {
      year: signedYear(year, era),
      month: dropMonth ? null : (month ?? null),
      day: dropDay ? null : (day ?? null),
    }
  }
  const parsed = parseIsoDateParts(iso)
  if (!parsed) return null
  return {
    year: parsed.year,
    month: dropMonth ? null : parsed.month,
    day: dropDay ? null : parsed.day,
  }
}

const lowerKey = (parts: DateParts) =>
  parts.year * 10000 + (parts.month ?? 1) * 100 + (parts.day ?? 1)

/** 재임 `notes`에 저장된 레거시 `왕명: …` 인코딩 */
function regnalNameFromNotes(notes: string | null | undefined): string | null {
  const match = notes?.match(/왕명\s*:\s*(.+?)(?:\n|$)/)
  return match ? match[1].trim() || null : null
}

/**
 * 재위 기록 → 즉위 구분선. 즉위일을 모르는 기록은 연표에 놓을 수 없어 뺀다.
 *
 * @param countryIds 목록에 나온 사건들의 관련 국가(현대·역사) id — 이 국가의 재위만 남긴다.
 *   목록과 무관한 나라의 즉위가 연대 흐름을 채우지 않게 하는 범위 한정이다.
 * @param personName 인물 표시명 함수(이름 표기 규칙은 호출부의 공용 헬퍼를 따른다)
 */
export function toReignMarkers(
  reigns: SovereignReignTimelineItem[] | null | undefined,
  countryIds: ReadonlySet<string>,
  personName: (person: NonNullable<SovereignReignTimelineItem['person']>) => string,
): ReignMarker[] {
  if (!reigns?.length || countryIds.size === 0) return []
  const markers: ReignMarker[] = []
  /* 표시 문구(나라·이름·기간)가 같은 재위는 하나만 남긴다. 실측: 프리드리히 3세가 **인물 행
   * 두 개**로 시딩돼 있어 '프로이센 왕국 Friedrich 1888–1888'이 한 말풍선에 두 번 찍혔다.
   * personId로 가르면 이 경우를 못 잡는다 — 글자가 같으면 두 번 찍을 이유가 없다. */
  const seen = new Set<string>()
  for (const reign of reigns) {
    const inScope =
      (reign.countryId && countryIds.has(reign.countryId)) ||
      (reign.historicalCountryId && countryIds.has(reign.historicalCountryId))
    if (!inScope) continue

    const start = resolveParts(
      reign.startEra,
      reign.startYear,
      reign.startMonth,
      reign.startDay,
      reign.startDate,
      reign.startDatePrecision,
    )
    if (!start) continue
    const person = reign.person ?? null
    const end =
      resolveParts(
        reign.endEra,
        reign.endYear,
        reign.endMonth,
        reign.endDay,
        reign.endDate,
        reign.endDatePrecision,
      ) ??
      // 퇴위일이 없으면 사망일로 닫는다(현직이면 열어 둔다).
      (person && !person.isAlive
        ? resolveParts(
            person.deathEra,
            null,
            null,
            null,
            person.deathDate,
            person.deathDatePrecision,
          )
        : null)

    const name =
      reign.regnalName?.trim() ||
      regnalNameFromNotes(reign.notes) ||
      person?.regnalName?.trim() ||
      person?.templeName?.trim() ||
      (person ? personName(person) : '') ||
      '군주'

    const countryName =
      reign.historicalCountry?.name ?? reign.country?.name ?? null
    const dedupeKey = [countryName, name, start.year, end?.year ?? ''].join('|')
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    markers.push({
      id: reign.id,
      personId: reign.personId,
      name,
      countryName,
      startKey: lowerKey(start),
      startYear: start.year,
      startMonth: start.month,
      startDay: start.day,
      endYear: end?.year ?? null,
    })
  }
  return markers.sort((left, right) => left.startKey - right.startKey)
}

const formatSignedYear = (year: number) =>
  year < 0 ? `BC ${-year}` : String(year)

/** '1418–1450' / 'BC 221–BC 210' / '1952–' (현직·미상) / '1888' (같은 해 즉위·퇴위) */
export function formatReignSpan(marker: ReignMarker): string {
  // '1888–1888'은 같은 숫자를 두 번 읽힌다 — 한 해 안에 끝난 재위는 연도 하나로 쓴다.
  if (marker.endYear === marker.startYear) return formatSignedYear(marker.startYear)
  const end = marker.endYear == null ? '' : formatSignedYear(marker.endYear)
  return `${formatSignedYear(marker.startYear)}–${end}`
}

/**
 * 즉위 시점 라벨 — 표지를 행과 같은 날짜 열에 세울 때 쓴다.
 *
 * 연 그룹 안(`contextYear`가 즉위 연도와 같음)이면 행 날짜와 같은 'M.D' / 'M월'이고,
 * 연도가 머리글에 없는 자리(연 사이·세기 앞·목록 끝)면 연도를 앞에 붙인다.
 * 연 정밀도뿐인 즉위가 연 그룹 안에 있으면 빈 문자열 — 머리글이 이미 그 연도다.
 */
export function formatAccessionDate(
  marker: ReignMarker,
  contextYear?: number,
): string {
  const monthDay =
    marker.startMonth == null
      ? ''
      : marker.startDay == null
        ? `${marker.startMonth}월`
        : `${marker.startMonth}.${marker.startDay}`
  if (contextYear === marker.startYear) return monthDay
  const year = formatSignedYear(marker.startYear)
  if (!monthDay) return year
  return marker.startDay == null ? `${year}.${marker.startMonth}` : `${year}.${monthDay}`
}

/**
 * 재위 햇수 — '1888–1918' 옆의 '30년'. 현직·미상(끝 없음)과 한 해 안에 끝난 재위는 null.
 * 부호 연도라 BC→AD를 건너면 0년이 없으므로 1을 뺀다(BC 27 → AD 14 = 40년).
 */
export function reignLengthYears(marker: ReignMarker): number | null {
  if (marker.endYear == null || marker.endYear <= marker.startYear) return null
  const crossesEra = marker.startYear < 0 && marker.endYear > 0
  return marker.endYear - marker.startYear - (crossesEra ? 1 : 0)
}

/**
 * 표지 동사 — 군주는 '즉위', 공화국 원수·막부 쇼군은 '취임'.
 *
 * 재위 기록(SovereignReign)에는 직위 유형이 없고, 공화국 대통령·쇼군도 같은 표에 든다
 * (실측: '프랑스 제3공화국 푸앵카레 레몽 즉위 1913–1920'). 나라 이름이 유일한 단서라
 * 그것으로 가른다 — 틀리는 쪽은 '즉위'로 남는 것이니 기존보다 나빠지지 않는다.
 */
export function accessionVerb(countryName: string | null | undefined): '즉위' | '취임' {
  return countryName && /공화국|공화정|막부/.test(countryName) ? '취임' : '즉위'
}

/** 말풍선 한 항목 — 같은 군주·같은 기간이 여러 나라 재위로 들어온 것을 하나로 묶는다 */
export interface ReignMarkerEntry {
  /** 대표 재위(첫 번째) — key·인물 모달 */
  marker: ReignMarker
  /** 묶인 재위들의 나라 이름(중복 제거, 등장 순) */
  countryNames: string[]
}

/**
 * 같은 이름·같은 기간 재위를 한 항목으로 묶는다.
 *
 * 동군연합(독일 황제 = 프로이센 왕)은 나라마다 재위 행이 따로라, 그대로 찍으면 한 말풍선에
 * '독일 제국 Wilhelm 즉위 1888–1918 · 프로이센 왕국 Wilhelm 즉위 1888–1918'처럼 같은
 * 즉위가 두 번 읽힌다. 나라 꼬리표만 늘리고 이름·기간은 한 번 쓴다.
 */
export function groupReignEntries(markers: ReignMarker[]): ReignMarkerEntry[] {
  const entries: ReignMarkerEntry[] = []
  const byKey = new Map<string, ReignMarkerEntry>()
  for (const marker of markers) {
    const key = `${marker.name}|${formatReignSpan(marker)}`
    const existing = byKey.get(key)
    if (existing) {
      if (marker.countryName && !existing.countryNames.includes(marker.countryName))
        existing.countryNames.push(marker.countryName)
      continue
    }
    const entry = {
      marker,
      countryNames: marker.countryName ? [marker.countryName] : [],
    }
    byKey.set(key, entry)
    entries.push(entry)
  }
  return entries
}

/**
 * 목록 범위 판정 — 이 즉위를 목록에 실을 것인가.
 * 마지막 사건 이후의 즉위, 첫 사건보다 이르면서 그 시점에 이미 퇴위한 재위는 버린다.
 * 첫 사건 시점에 **재위 중**인 군주는 남긴다('목록이 시작될 때 누가 다스렸나').
 */
export function isReignInRange(
  marker: ReignMarker,
  range: { min: number; max: number },
): boolean {
  if (marker.startYear > range.max) return false
  if (
    marker.startYear < range.min &&
    marker.endYear != null &&
    marker.endYear < range.min
  ) {
    return false
  }
  return true
}

/**
 * 즉위 연도 — 사건이 없어도 연 그룹을 세울 연도들(`buildYearBuckets`의 `extraYears`).
 * 즉위 해가 곧 연 머리글이 되어, 표지는 그 해 안에 선다.
 */
export function reignAccessionYears(
  markers: ReignMarker[],
  range: { min: number; max: number },
): number[] {
  return markers
    .filter((marker) => isReignInRange(marker, range))
    .map((marker) => marker.startYear)
}

export interface ReignMarkerPlan {
  /** 세기 머리글 **앞**에 놓일 구분선 — 즉위 세기에 사건이 하나도 없을 때 */
  beforeCentury: Map<number, ReignMarker[]>
  /** 연 머리글 **앞**에 놓일 구분선 — 즉위 해에 사건이 없을 때(공백 구간의 즉위) */
  beforeYear: Map<number, ReignMarker[]>
  /** 즉위 해에 사건이 있어 그 연 그룹 **안**에 끼워 넣을 구분선 */
  inYear: Map<number, ReignMarker[]>
  /** 표시 순서상 마지막 그룹 뒤 — 내림차순에서 목록 첫 사건보다 이른 즉위 */
  trailing: ReignMarker[]
}

const pushTo = <Key,>(map: Map<Key, ReignMarker[]>, key: Key, marker: ReignMarker) => {
  const list = map.get(key)
  if (list) list.push(marker)
  else map.set(key, [marker])
}

/**
 * 구분선을 목록의 세기›연 그룹 사이 어디에 놓을지 정한다.
 *
 * - 즉위 해에 연 그룹이 있으면 → 그 그룹 안(행 사이 위치는 `interleaveReignMarkers`).
 * - 없으면 → 시간상 다음에 **표시되는** 그룹 앞. 그 그룹이 세기의 첫 해이고 즉위가
 *   다른 세기면 세기 머리글 앞에 둔다(15세기 머리글 아래에 14세기 즉위가 오지 않게).
 * - 목록 범위 밖은 버린다: 마지막 사건 이후의 즉위, 그리고 첫 사건보다 이르면서
 *   그 시점에 이미 퇴위한 재위. 첫 사건 시점에 **재위 중**인 군주는 남긴다 —
 *   '목록이 시작될 때 누가 다스리고 있었나'는 필요한 문맥이다.
 */
export function planReignMarkers(
  markers: ReignMarker[],
  centuryGroups: Array<{ century: number; years: number[] }>,
  direction: 'asc' | 'desc',
  /**
   * 범위 판정의 모수 — **사건이 있는** 연도의 최소·최대. 즉위 연도로 세운 빈 연 그룹까지
   * 모수에 넣으면 범위가 스스로 넓어져, 연 그룹을 받지 못한 즉위가 끼어든다.
   * 생략하면 표시 연도 전체.
   */
  eventRange?: { min: number; max: number },
): ReignMarkerPlan {
  const plan: ReignMarkerPlan = {
    beforeCentury: new Map(),
    beforeYear: new Map(),
    inYear: new Map(),
    trailing: [],
  }
  const displayYears = centuryGroups.flatMap((group) => group.years)
  if (markers.length === 0 || displayYears.length === 0) return plan

  const yearSet = new Set(displayYears)
  const firstYearOfCentury = new Set(
    centuryGroups.map((group) => group.years[0]),
  )
  const range = eventRange ?? {
    min: Math.min(...displayYears),
    max: Math.max(...displayYears),
  }

  for (const marker of markers) {
    const startYear = marker.startYear
    if (!isReignInRange(marker, range)) continue
    if (yearSet.has(startYear)) {
      pushTo(plan.inYear, startYear, marker)
      continue
    }
    const nextYear = displayYears.find((year) =>
      direction === 'asc' ? year > startYear : year < startYear,
    )
    if (nextYear == null) {
      plan.trailing.push(marker)
      continue
    }
    if (
      firstYearOfCentury.has(nextYear) &&
      getCentury(nextYear) !== getCentury(startYear)
    ) {
      pushTo(plan.beforeCentury, getCentury(nextYear), marker)
    } else {
      pushTo(plan.beforeYear, nextYear, marker)
    }
  }

  // 한 자리에 여럿이면 표시 방향의 시간순으로.
  const order = (list: ReignMarker[]) =>
    list.sort((left, right) =>
      direction === 'asc'
        ? left.startKey - right.startKey
        : right.startKey - left.startKey,
    )
  plan.beforeCentury.forEach(order)
  plan.beforeYear.forEach(order)
  plan.inYear.forEach(order)
  order(plan.trailing)
  return plan
}

export type InterleavedEntry<T> =
  | { kind: 'row'; item: T }
  /** 같은 자리에 연달아 오는 즉위는 한 줄로 묶는다 — 줄 수가 곧 소음이다 */
  | { kind: 'reign'; markers: ReignMarker[] }

/**
 * 연 그룹 안에서 행과 즉위 구분선을 섞는다.
 *
 * 행이 시간순일 때(`chronological`)만 날짜로 위치를 잡는다 — 구분선은 즉위일 이후 첫
 * 최상위 행 앞(오름차순), 즉위일 이전 첫 최상위 행 앞(내림차순)에 온다. 하위 행은 부모에
 * 붙어 다니므로 최상위 행 경계에만 끼운다. 기간·하위 수 정렬처럼 연 그룹 안이 시간순이
 * 아니면 날짜 위치가 의미 없으니 그룹 맨 앞에 모은다.
 */
export function interleaveReignMarkers<T>(
  items: T[],
  markers: ReignMarker[] | undefined,
  options: {
    direction: 'asc' | 'desc'
    chronological: boolean
    /** 최상위 행이면 그 행의 시작 키, 하위 행·날짜 미상이면 null */
    rowStartKey: (item: T) => number | null
  },
): InterleavedEntry<T>[] {
  const rows: InterleavedEntry<T>[] = items.map((item) => ({
    kind: 'row',
    item,
  }))
  if (!markers?.length) return rows
  if (!options.chronological) return [{ kind: 'reign', markers }, ...rows]

  const result: InterleavedEntry<T>[] = []
  let pending = [...markers]
  for (const item of items) {
    const key = options.rowStartKey(item)
    if (key != null && pending.length > 0) {
      const due = pending.filter((marker) =>
        options.direction === 'asc'
          ? marker.startKey <= key
          : marker.startKey > key,
      )
      if (due.length > 0) {
        result.push({ kind: 'reign', markers: due })
        pending = pending.filter((marker) => !due.includes(marker))
      }
    }
    result.push({ kind: 'row', item })
  }
  if (pending.length > 0) result.push({ kind: 'reign', markers: pending })
  return result
}

/** 사건 기간 시작(ISO + 정밀도) → 하한 키. 시작을 모르면 null. */
export function eventStartKey(period: {
  start: string
  startPrecision?: string | null
}): number | null {
  const start = parseIsoDateParts(period.start)
  if (!start) return null
  const yearOnly =
    period.startPrecision === 'year' ||
    (period.startPrecision == null && start.month === 1 && start.day === 1)
  return lowerKey({
    year: start.year,
    month: yearOnly ? null : start.month,
    day: yearOnly || period.startPrecision === 'month' ? null : start.day,
  })
}
