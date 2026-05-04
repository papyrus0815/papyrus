import type { PersonDetail } from './dto'

type EraStr = 'AD' | 'BC' | 'BCE' | 'CE' | string | null | undefined

function isBC(era: EraStr) {
  return era === 'BC' || era === 'BCE'
}

/** BC면 음수, AD면 양수 부호로 통일 */
export function signedYear(era: EraStr, year: number): number {
  return isBC(era) ? -Math.abs(year) : Math.abs(year)
}

/** 출생/사망 연도를 부호 있는 숫자로. 없으면 null. */
export function ageAtDeath(p: PersonDetail): number | null {
  if (!p.birthYear || !p.deathYear || p.isAlive || p.isDeathDateUnknown) return null
  const b = signedYear(p.birthEra, p.birthYear)
  const d = signedYear(p.deathEra, p.deathYear)
  if (d < b) return null
  return d - b
}

/** 생존 중이면 오늘까지의 연수, 사망이면 사망 시 나이 */
export function lifespanYears(p: PersonDetail): number | null {
  if (!p.birthYear) return null
  const b = signedYear(p.birthEra, p.birthYear)
  if (p.isAlive) {
    const today = new Date().getFullYear()
    return today - b
  }
  return ageAtDeath(p)
}

/** ISO 시작/종료(또는 null=현재) 사이 일수 합 (음수 결과 방지) */
function isoDays(startISO?: string | null, endISO?: string | null): number {
  if (!startISO) return 0
  const s = new Date(startISO).getTime()
  if (Number.isNaN(s)) return 0
  const e = endISO ? new Date(endISO).getTime() : Date.now()
  if (Number.isNaN(e)) return 0
  return Math.max(0, (e - s) / 86_400_000)
}

/** 재임 + 재위 총 연수(반올림). 0이면 null. */
export function totalReignAndTenureYears(p: PersonDetail): number | null {
  const items = [
    ...(p.sovereignReigns ?? []),
    ...(p.governmentPositions ?? []),
  ]
  if (!items.length) return null
  const totalDays = items.reduce((acc, it) => acc + isoDays(it.startDate, it.endDate), 0)
  const years = Math.round(totalDays / 365.25)
  return years > 0 ? years : null
}
