/**
 * 출생연도/활동연도 → 세기 분류 및 생몰년도 표기 포맷터.
 * 학술 컨벤션: 1701-1800 = 18세기, BC 100-1 = 기원전 1세기.
 */
import type { AdaptedPerson } from './types'

export interface CenturyMeta {
  key: string
  label: string
  from: number
  to: number
  /** 정렬용 — BC는 음수, AD는 양수. */
  sortKey: number
}

export function centuryOf(year: number): CenturyMeta {
  const isBC = year < 0
  const abs = Math.abs(year)
  const c = Math.max(1, Math.floor((abs - 1) / 100) + 1)
  const from = isBC ? -(c * 100) : (c - 1) * 100 + 1
  const to = isBC ? -((c - 1) * 100 + 1) : c * 100
  return {
    key: isBC ? `bc-${c}` : `ad-${c}`,
    label: isBC ? `기원전 ${c}세기` : `${c}세기`,
    from,
    to,
    sortKey: isBC ? -c : c,
  }
}

/** "−500" / "1750" → "500BC" / "1750" */
export function formatYear(y: number): string {
  return y < 0 ? `${-y}BC` : `${y}`
}

/** 추정(circa) 플래그가 있으면 '경' 접미사를 붙여 반환 (예: "1500경", "480BC경") */
export function formatYearWithCirca(
  y: number,
  approximate?: boolean,
): string {
  const base = formatYear(y)
  return approximate ? `${base}경` : base
}

export interface PersonLifespanDisplay {
  /**
   * 표시 모드:
   * - 'lifespan': 출생/사망 연도 중 최소 하나가 알려진 경우 (예: 1397 – 1450, 미상 – 1558, 1950 – 현재)
   * - 'activity-range': 생몰 모두 미상이지만 재위/재임/활동 시작~종료 구간이 있는 경우 (예: 재위 37BC–19BC, 활동 1200–1250)
   * - 'activity-point': 생몰 모두 미상이고 단일 활동연도만 있는 경우 (예: 활동 612경)
   * - 'unknown': 모든 연도 미상 ('생몰 미상')
   */
  kind: 'lifespan' | 'activity-range' | 'activity-point' | 'unknown'
  bornText: string
  bornUnknown: boolean
  diedText: string
  diedUnknown: boolean
  fallbackLabel: string | null
  summaryText: string
  ariaText: string
  ageLabel: string | null
}

/**
 * 카드·리스트·툴팁·연표에서 공통으로 사용하는 생몰/활동 연도 표기 생성기.
 * - 추정 연도(birthApproximate/deathApproximate)는 `경` 표기
 * - 한쪽만 미상인 경우 `?` 대신 명시적 `미상` 표기
 * - 생몰 모두 미상일 때 재위/활동 시작~종료 구간이 있으면 `재위 A–B` / `활동 A–B`로 표기
 */
export function describePersonLifespan(
  person: AdaptedPerson,
): PersonLifespanDisplay {
  const hasLifespanYear = person.born != null || person.died != null

  if (!hasLifespanYear) {
    const actPrefix = person.isMonarch ? '재위' : '활동'
    const actStart =
      person.activityStart != null ? Math.round(person.activityStart) : null
    const actEnd =
      person.activityEnd != null ? Math.round(person.activityEnd) : null

    if (actStart != null && actEnd != null && actStart !== actEnd) {
      const label = `${actPrefix} ${formatYear(actStart)}–${formatYear(actEnd)}`
      return {
        kind: 'activity-range',
        bornText: '미상',
        bornUnknown: true,
        diedText: '미상',
        diedUnknown: true,
        fallbackLabel: label,
        summaryText: label,
        ariaText: label,
        ageLabel: null,
      }
    }

    const singleYear =
      actStart ??
      actEnd ??
      (person.activityYear != null ? Math.round(person.activityYear) : null)

    if (singleYear != null) {
      const label = `${actPrefix} ${formatYear(singleYear)}경`
      return {
        kind: 'activity-point',
        bornText: '미상',
        bornUnknown: true,
        diedText: '미상',
        diedUnknown: true,
        fallbackLabel: label,
        summaryText: label,
        ariaText: label,
        ageLabel: null,
      }
    }

    return {
      kind: 'unknown',
      bornText: '미상',
      bornUnknown: true,
      diedText: '미상',
      diedUnknown: true,
      fallbackLabel: '생몰 미상',
      summaryText: '생몰 미상',
      ariaText: '생몰 미상',
      ageLabel: null,
    }
  }

  const bornUnknown = person.born == null
  const bornText =
    person.born == null
      ? '미상'
      : formatYearWithCirca(person.born, person.birthApproximate)

  const diedUnknown = !person.isAlive && person.died == null
  const diedText = person.isAlive
    ? '현재'
    : person.died == null
      ? '미상'
      : formatYearWithCirca(person.died, person.deathApproximate)

  const isApproxAge = !!(person.birthApproximate || person.deathApproximate)
  const ageLabel =
    person.age != null
      ? person.isAlive
        ? isApproxAge
          ? `약 ${person.age}세`
          : `${person.age}세`
        : isApproxAge
          ? `향년 약 ${person.age}세`
          : `향년 ${person.age}세`
      : null

  return {
    kind: 'lifespan',
    bornText,
    bornUnknown,
    diedText,
    diedUnknown,
    fallbackLabel: null,
    summaryText: `${bornText} – ${diedText}`,
    ariaText: `생몰 ${bornText}–${diedText}`,
    ageLabel,
  }
}

/**
 * 세기 그룹 나열 순서 비교기.
 * order='desc'(기본)는 최신 세기 먼저, 'asc'는 오래된 세기 먼저.
 * '연도 미상'(key==='unknown', sortKey=+∞)은 방향과 무관하게 항상 맨 끝.
 */
export function compareCenturyMeta(
  centuryA: CenturyMeta,
  centuryB: CenturyMeta,
  order: 'asc' | 'desc',
): number {
  const aUnknown = centuryA.key === 'unknown'
  const bUnknown = centuryB.key === 'unknown'
  if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
  const dir = order === 'desc' ? -1 : 1
  return (centuryA.sortKey - centuryB.sortKey) * dir
}
