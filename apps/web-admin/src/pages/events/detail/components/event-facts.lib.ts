/**
 * 사건 개요 장부(DetailFacts)의 순수 계산 — 기간 길이, 역할별 참여국 묶음.
 */
// 모델 index는 API 서비스까지 끌고 와 jest에서 import.meta로 깨진다 — 순수 모듈만 직접
import { EVENT_COUNTRY_ROLE_OPTIONS } from '@/entities/event/model/country-participant'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

/** 기원전에는 0년이 없다 — 기원전 1년 다음이 1년이라 차를 구하려면 천문 연도로 옮긴다. */
const astronomicalYear = (year: number) => (year < 0 ? year + 1 : year)

const isDayPrecise = (iso: string, precision?: string | null) => {
  if (precision === 'year' || precision === 'month') return false
  if (precision === 'day') return true
  // 정밀도 NULL인 1월 1일은 '연도만 안다'는 자리 표시다(formatDateRange와 같은 판정).
  const parts = parseIsoDateParts(iso)
  return Boolean(parts && !(parts.month === 1 && parts.day === 1))
}

/**
 * 그레고리력은 400년마다 윤년 배치가 되풀이된다 — 기원전·고대 연도를 400의 배수만큼
 * 미래로 옮겨 JS Date로 센다(월 길이·두 날짜의 차는 그대로). 0~99년을 1900년대로
 * 읽는 Date.UTC 함정도 이 이동으로 피한다. 기원전 약 4만 년까지 안전.
 */
const YEAR_SHIFT = 400 * 100

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year + YEAR_SHIFT, month, 0)).getUTCDate()

/** 천문 연도 기준 일련 일수 — 두 날짜의 차를 구하는 데만 쓴다. */
const dayNumber = (year: number, month: number, day: number) =>
  Math.round(Date.UTC(year + YEAR_SHIFT, month - 1, day) / 86_400_000)

/**
 * 사건이 얼마나 이어졌나 — '3년 1개월 2일'.
 *
 * 양 끝이 **일까지 아는** 날짜일 때만 센다. 연·월만 아는 끝으로 일수를 세면 없는 정밀도를
 * 지어내게 된다. 하루짜리(같은 날)·역순·파싱 불가는 null — 장부에서 행을 내린다.
 */
export function durationLabel(
  start?: string | null,
  end?: string | null,
  startPrecision?: string | null,
  endPrecision?: string | null,
): string | null {
  if (!start || !end) return null
  if (!isDayPrecise(start, startPrecision) || !isDayPrecise(end, endPrecision))
    return null
  const from = parseIsoDateParts(start)
  const to = parseIsoDateParts(end)
  if (!from || !to) return null

  const fromYear = astronomicalYear(from.year)
  const toYear = astronomicalYear(to.year)
  let totalMonths = (toYear - fromYear) * 12 + (to.month - from.month)
  // 시작일에서 그 개월 수만큼 간 날(달 끝에서 잘림 — 1월 31일 + 1개월 = 2월 말)이 끝을
  // 넘으면 한 달 덜 간 것이다. 남은 일수는 그 날부터 끝까지.
  const anchorOf = (months: number) => {
    const monthIndex = from.month - 1 + months
    const year = fromYear + Math.floor(monthIndex / 12)
    const month = (((monthIndex % 12) + 12) % 12) + 1
    return dayNumber(year, month, Math.min(from.day, daysInMonth(year, month)))
  }
  const endDay = dayNumber(toYear, to.month, to.day)
  if (anchorOf(totalMonths) > endDay) totalMonths -= 1
  const days = endDay - anchorOf(totalMonths)
  if (totalMonths < 0 || (totalMonths === 0 && days <= 0)) return null
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  return [
    years > 0 ? `${years}년` : null,
    months > 0 ? `${months}개월` : null,
    days > 0 ? `${days}일` : null,
  ]
    .filter(Boolean)
    .join(' ')
}

export interface RoleCountry {
  id: string
  name: string
  role?: string | null
  /** 역사 국가 — 장부에서 기울임으로 구분(히어로와 같은 규약) */
  historical: boolean
}

export interface RoleGroup {
  /** 역할 라벨 — 역할이 비어 있는 나라는 '관련국'으로 묶는다 */
  label: string
  countries: RoleCountry[]
}

/**
 * 참여국을 **배역별로** 묶는다 — '누가 어느 편이었나'는 히어로의 나라 나열이 말하지 못하는
 * 사실이다(한국전쟁: 참여국 미국·영국 / 적대국 중국·소련 / 관찰국 일본).
 * 순서는 역할 선택지 순서(EVENT_COUNTRY_ROLE_OPTIONS), 역할 없는 나라는 맨 뒤.
 */
export function groupCountriesByRole(countries: RoleCountry[]): RoleGroup[] {
  const groups: RoleGroup[] = []
  for (const option of EVENT_COUNTRY_ROLE_OPTIONS) {
    const members = countries.filter((country) => country.role === option.value)
    if (members.length > 0) groups.push({ label: option.label, countries: members })
  }
  const known = new Set<string>(EVENT_COUNTRY_ROLE_OPTIONS.map((option) => option.value))
  const unassigned = countries.filter(
    (country) => !country.role || !known.has(country.role),
  )
  if (unassigned.length > 0) groups.push({ label: '관련국', countries: unassigned })
  return groups
}
