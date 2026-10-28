/**
 * 사건 날짜 칸의 직접 입력 ↔ 폼 값 변환.
 *
 * 폼은 날짜를 ISO 비슷한 문자열(`-0044-03-15`, BC는 앞에 '-') + 정밀도(year|month|day)로 들고,
 * 칸은 기원·연·월·일을 따로 친다. 정밀도는 **채운 칸**으로 정한다 — 연도만이면 year(`YYYY-01-01`),
 * 연·월이면 month, 연·월·일이면 day. 달력의 '연도만'·'연·월' 선택과 같은 결과가 나와야 한다.
 *
 * 달력은 잘못된 날짜를 애초에 못 고르게 막았지만 직접 입력엔 그 보호가 없다 — 그래서 여기서
 * 월 범위·그 달의 날수(윤년)·0년·빈 앞자리(연도 없이 월)를 검사해 오류 문구를 돌려준다.
 * 네이티브 Date는 쓰지 않는다(BC·고대 연도에서 어긋난다).
 */
import type { DatePickerPrecision } from '@/shared/ui/date-picker/date-picker-modal'

export type DateEra = 'AD' | 'BC'

export interface EventDateParts {
  era: DateEra
  year: string
  month: string
  day: string
}

export type EventDatePartsResult =
  | { kind: 'empty' }
  | { kind: 'ok'; iso: string; precision: DatePickerPrecision }
  | { kind: 'error'; message: string }

export const EMPTY_DATE_PARTS: EventDateParts = { era: 'AD', year: '', month: '', day: '' }

/** 폼 값 → 칸. 정밀도 밖의 월·일(채움값 01)은 비워 둔다('1950년'이 '1950.1.1'로 보이지 않게) */
export function partsFromIso(
  iso: string,
  precision: DatePickerPrecision = 'day',
  fallbackEra: DateEra = 'AD',
): EventDateParts {
  if (!iso) return { ...EMPTY_DATE_PARTS, era: fallbackEra }
  const isBc = iso.startsWith('-')
  const match = (isBc ? iso.slice(1) : iso).match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})/)
  if (!match) return { ...EMPTY_DATE_PARTS, era: fallbackEra }
  const [, year, month, day] = match
  return {
    era: isBc ? 'BC' : 'AD',
    year: String(parseInt(year, 10)),
    month: precision === 'year' ? '' : String(parseInt(month, 10)),
    day: precision === 'day' ? String(parseInt(day, 10)) : '',
  }
}

/** 그 달의 날수 — 윤년은 천문학적 연도(기원전 1년 = 0년)에 그레고리력 규칙을 적용 */
export function daysInMonth(era: DateEra, year: number, month: number): number {
  if (month === 2) {
    const astronomicalYear = era === 'BC' ? 1 - year : year
    const leap =
      (astronomicalYear % 4 === 0 && astronomicalYear % 100 !== 0) || astronomicalYear % 400 === 0
    return leap ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

const pad = (value: number, width: number) => String(value).padStart(width, '0')

/**
 * 칸 → 폼 값. `allowPartial`이 거짓이면(정밀도를 저장할 수 없는 폼) 일까지 다 쳐야 한다.
 */
export function partsToIso(
  parts: EventDateParts,
  { allowPartial }: { allowPartial: boolean },
): EventDatePartsResult {
  const { era, year, month, day } = parts
  if (!year && !month && !day) return { kind: 'empty' }
  if (!year) return { kind: 'error', message: '연도를 먼저 입력해 주세요.' }
  const yearNumber = parseInt(year, 10)
  if (yearNumber === 0) {
    return { kind: 'error', message: '0년은 없습니다 — 서기 1년 바로 앞은 기원전 1년입니다.' }
  }
  if (!month && day) return { kind: 'error', message: '일을 넣으려면 월도 입력해 주세요.' }

  let monthNumber = 1
  if (month) {
    monthNumber = parseInt(month, 10)
    if (monthNumber < 1 || monthNumber > 12) {
      return { kind: 'error', message: '월은 1부터 12까지입니다.' }
    }
  }
  let dayNumber = 1
  if (day) {
    dayNumber = parseInt(day, 10)
    const lastDay = daysInMonth(era, yearNumber, monthNumber)
    if (dayNumber < 1 || dayNumber > lastDay) {
      return { kind: 'error', message: `${monthNumber}월은 ${lastDay}일까지입니다.` }
    }
  }

  const precision: DatePickerPrecision = day ? 'day' : month ? 'month' : 'year'
  if (!allowPartial && precision !== 'day') {
    return { kind: 'error', message: '연·월·일을 모두 입력해 주세요.' }
  }
  const sign = era === 'BC' ? '-' : ''
  return {
    kind: 'ok',
    iso: `${sign}${pad(yearNumber, 4)}-${pad(monthNumber, 2)}-${pad(dayNumber, 2)}`,
    precision,
  }
}
