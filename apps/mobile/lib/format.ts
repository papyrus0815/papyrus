type Era = 'AD' | 'BC' | 'BCE' | 'CE' | string

function eraPrefix(era?: Era | null): string {
  if (era === 'BC' || era === 'BCE') return 'BC '
  return ''
}

/** year/month/day 숫자 분리 필드 → "1945-08-15", "1945-08", "1945", "BC 220" */
export function formatYMD(
  era: Era | null | undefined,
  year: number | null | undefined,
  month?: number | null,
  day?: number | null,
): string | null {
  if (year == null) return null
  const y = Math.abs(year).toString()
  const prefix = eraPrefix(era)
  if (day != null && month != null) {
    return `${prefix}${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  if (month != null) return `${prefix}${y}-${String(month).padStart(2, '0')}`
  return `${prefix}${y}`
}

/** YYYY[-MM-DD] 문자열 → "1945-08-15" 그대로 또는 precision에 맞춰 자름 */
export function formatDateString(
  date: string | null | undefined,
  precision?: string | null,
): string | null {
  if (!date) return null
  const m = date.match(/^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/)
  if (!m) return date
  const [, y, mo, d] = m
  if (precision === 'year' || (!mo && !d)) return y
  if (precision === 'month' || !d) return `${y}-${mo}`
  return `${y}-${mo}-${d}`
}

export function lifespan(p: {
  birthEra?: Era | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  deathEra?: Era | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  isAlive?: boolean | null
  isDeathDateUnknown?: boolean | null
}) {
  const birth = formatYMD(p.birthEra, p.birthYear, p.birthMonth, p.birthDay)
  let death: string | null = null
  if (p.isAlive) death = '생존'
  else if (p.isDeathDateUnknown) death = '미상'
  else death = formatYMD(p.deathEra, p.deathYear, p.deathMonth, p.deathDay)
  if (!birth && !death) return ''
  return `${birth ?? '?'} ~ ${death ?? '?'}`
}

export function displayName(person: {
  name?: string | null
  surname?: string | null
  nameDisplayOrder?: string | null
}) {
  const { name, surname, nameDisplayOrder } = person
  if (!name && !surname) return '(이름 없음)'
  if (!surname) return name ?? ''
  if (!name) return surname
  return nameDisplayOrder === 'western' ? `${name} ${surname}` : `${surname}${name}`
}

export function dateRange(opts: {
  startEra?: Era | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: Era | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}): string | null {
  const start = formatYMD(opts.startEra, opts.startYear, opts.startMonth, opts.startDay)
  const end = formatYMD(opts.endEra, opts.endYear, opts.endMonth, opts.endDay)
  if (!start && !end) return null
  return `${start ?? '?'} ~ ${end ?? '현재'}`
}

export function placeText(opts: {
  city?: { name: string } | null
  adminDivision?: { name: string } | null
  placeText?: string | null
}): string | null {
  const parts: string[] = []
  if (opts.adminDivision?.name) parts.push(opts.adminDivision.name)
  if (opts.city?.name) parts.push(opts.city.name)
  if (opts.placeText) parts.push(opts.placeText)
  return parts.length ? parts.join(' · ') : null
}
