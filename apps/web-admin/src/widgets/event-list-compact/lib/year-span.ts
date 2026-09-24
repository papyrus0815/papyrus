/**
 * 기간 열 막대의 기하 — **그 해 안에서의 위치·길이** (순수)
 * FSD: widgets/event-list-compact/lib
 *
 * 타임라인 뷰를 목록에 합치면서 넘어온 유일한 인코딩이다. 폐기된 타임라인은 전 시대를
 * 하나의 가로축에 놓으려다 화면의 절반을 축 조작에 썼고, 그 결과가 목록과 "사실상
 * 똑같은" 표였다. 여기서는 축을 **행이 이미 속해 있는 연 그룹**으로 좁힌다 —
 * 그러면 52~92px짜리 열 하나로 충분하고, 좌표계를 설명할 축 헤더도 필요 없다
 * (그룹 머리글이 이미 '1911년'이라고 말하고 있다).
 *
 * ⚠️ 네이티브 `Date`를 쓰지 않는다. BC 연도를 넣으면 조용히 다른 해로 바뀐다
 *   (프로젝트 전역 규약 — `event-structured-bc-date`).
 */

/** 각 달 1일의 통년 일수(평년). 3월 이후는 윤년에 +1. */
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

/**
 * 윤년 판정 — 연도 0이 없는 역법을 그레고리력 규칙에 태운다(1 BC = 천문 0년).
 * BC 구간에 그레고리력을 적용하는 것 자체가 시대착오지만, 여기서 걸린 것은
 * 365분의 1짜리 가로 위치 한 칸이다.
 */
const isLeapYear = (year: number): boolean => {
  const astronomical = year > 0 ? year : year + 1
  return (
    (astronomical % 4 === 0 && astronomical % 100 !== 0) ||
    astronomical % 400 === 0
  )
}

const daysInYear = (year: number): number => (isLeapYear(year) ? 366 : 365)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** 그 해 1월 1일부터 센 0-기반 일수. */
const dayOfYear = (year: number, month: number, day: number): number => {
  const safeMonth = clamp(Math.trunc(month), 1, 12)
  const leapShift = safeMonth > 2 && isLeapYear(year) ? 1 : 0
  return DAYS_BEFORE_MONTH[safeMonth - 1] + leapShift + clamp(Math.trunc(day), 1, 31) - 1
}

/** 이 연도 안에서의 위치(0 = 1월 1일 0시, 1 = 12월 31일 24시). */
const fractionOfYear = (year: number, month: number, day: number): number =>
  dayOfYear(year, month, day) / daysInYear(year)

/**
 * 그 **날의 끝**(다음 날 0시). ⚠️ `day + 1`을 `dayOfYear`에 넘기면 안 된다 —
 * 일자는 1..31로 clamp되므로 12월 31일의 끝이 12월 31일 시작으로 되돌아온다.
 */
const fractionAfterDay = (year: number, month: number, day: number): number =>
  (dayOfYear(year, month, day) + 1) / daysInYear(year)

/**
 * 그 **달의 끝**(다음 달 1일). ⚠️ `month + 1`도 같은 이유로 직접 넘길 수 없다 —
 * 12월의 끝이 12월 1일이 된다.
 */
const fractionAfterMonth = (year: number, month: number): number => {
  if (Math.trunc(month) >= 12) return 1
  return fractionOfYear(year, month + 1, 1)
}

export interface YearSpanParts {
  year: number
  month: number
  day: number
}

/** 서버가 내려보내는 날짜 정밀도 — `null`은 일 정밀도로 본다(기존 규약). */
export type DatePrecision = string | null | undefined

const isDayPrecise = (precision: DatePrecision): boolean =>
  precision == null || precision === 'day'

/**
 * 이 연 축 **바깥**에 있는 행 — 막대 대신 방향 표지만 그린다.
 * (`outside`의 유무가 두 모양을 가르는 판별자다.)
 */
export interface YearSpanOutside {
  outside: 'before' | 'after'
}

export interface YearSpanGeometry {
  outside?: undefined
  /** 트랙 좌측에서의 시작 비율 0..1 */
  start: number
  /** 트랙 좌측에서의 종료 비율 0..1 (`start`와 같으면 시점) */
  end: number
  /** 이 해 **이전에** 시작했다 — 좌측 끝을 흐리며 끊는다 */
  clippedStart: boolean
  /** 이 해 **이후까지** 이어진다 — 우측 끝을 흐리며 끊는다 */
  clippedEnd: boolean
  /** 폭이 없는 시점 사건 — 막대가 아니라 점으로 그린다 */
  isPoint: boolean
  /**
   * 일 정밀도가 아니다 — 막대는 '언제인지 아는 범위'이지 '지속 기간'이 아니다.
   * 연 정밀도 사건을 1월 1일 점으로 찍으면 없는 사실을 지어내므로, 아는 단위
   * (그 해 전체 / 그 달 전체)를 통째로 칠하고 흐리게 그려 구분한다.
   */
  approximate: boolean
}

/**
 * 한 행의 막대 기하를 구한다. 놓을 수 없으면 `null`(호출부는 기간 텍스트로 되돌아간다).
 *
 * `scopeYear`는 이 행이 렌더되는 연 그룹이다 — 하위 사건은 자기 시작연도가 아니라
 * **부모가 놓인 버킷**을 따라오므로, 시작연도로 스코프를 잡으면 같은 그룹의 행들이
 * 서로 다른 축 위에 그려진다(그리고 아무도 그 사실을 알 수 없다).
 */
export function yearSpanGeometry(input: {
  scopeYear: number | null
  start: YearSpanParts | null
  end: YearSpanParts | null
  startPrecision?: DatePrecision
  endPrecision?: DatePrecision
}): YearSpanGeometry | YearSpanOutside | null {
  const { start, end, startPrecision, endPrecision } = input
  if (!start) return null
  /* 평면 보기·연도 미상 그룹은 연 그룹이 없다 — 사건 자신의 해를 축으로 삼는다. */
  const scopeYear = input.scopeYear ?? start.year
  if (!Number.isFinite(scopeYear)) return null

  const endYear = end?.year ?? start.year
  /*
   * 이 해에 걸치지 않는 행 — 하위 사건은 **부모의 버킷**을 따라오므로 실제로 생긴다
   * (2025년 그룹에 놓인 2026년 자식). 그 해의 축 위에 그리면 없는 사실을 지어내므로
   * 막대를 포기하되, 어느 쪽 바깥인지는 말한다 — 빈 칸으로 두면 '기간 정보 없음'과
   * 구별되지 않는다.
   */
  if (start.year > scopeYear) return { outside: 'after' }
  if (endYear < scopeYear) return { outside: 'before' }

  const approximate = !isDayPrecise(startPrecision) || !isDayPrecise(endPrecision)
  const clippedStart = start.year < scopeYear
  const clippedEnd = endYear > scopeYear

  const startFraction = (() => {
    if (clippedStart) return 0
    if (startPrecision === 'year') return 0
    if (startPrecision === 'month') return fractionOfYear(scopeYear, start.month, 1)
    return fractionOfYear(scopeYear, start.month, start.day)
  })()

  /** 종료는 **그 단위의 끝**이다 — 6월까지 이어진 사건의 막대가 6월 1일에 멈추면 안 된다. */
  const endFraction = (() => {
    if (clippedEnd) return 1
    if (!end) {
      /* 종료 미상 — 아는 단위만큼만 칠한다(연 정밀도면 그 해 전체). */
      if (startPrecision === 'year') return 1
      if (startPrecision === 'month') return fractionAfterMonth(scopeYear, start.month)
      return fractionAfterDay(scopeYear, start.month, start.day)
    }
    if (endPrecision === 'year') return 1
    if (endPrecision === 'month') return fractionAfterMonth(scopeYear, end.month)
    return fractionAfterDay(scopeYear, end.month, end.day)
  })()

  const safeStart = clamp(startFraction, 0, 1)
  const safeEnd = clamp(Math.max(endFraction, safeStart), 0, 1)

  /**
   * 시점 판정 — 하루(혹은 그 이하)짜리는 막대가 아니라 점이다. 실측상 목록의 절반이
   * 당일 사건이라, 이 둘을 같은 모양으로 그리면 '지속된 사건 찾기'가 다시 불가능해진다.
   */
  const isPoint =
    !clippedStart && !clippedEnd && !approximate && safeEnd - safeStart <= 1.5 / daysInYear(scopeYear)

  return {
    start: safeStart,
    end: safeEnd,
    clippedStart,
    clippedEnd,
    isPoint,
    approximate,
  }
}
