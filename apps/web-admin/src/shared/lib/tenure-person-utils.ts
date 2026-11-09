export interface SignedDateParts {
  signedYear: number
  absYear: number
  era: 'BC' | 'AD'
  month: number
  day: number
}

/**
 * 부호 있는 ISO 문자열(`-0221-01-01`, `1392-07-17`) 또는 Date 객체에서
 * 기원전(BC)/서기(AD) 안전하게 연·월·일을 추출한다.
 * (표준 JS `new Date('-0221-01-01')`는 6자리 확장 연도가 아니면 Invalid Date를 반환하므로 직접 파싱)
 */
export function parseSignedDateParts(
  raw: string | Date | null | undefined,
  eraHint?: 'BC' | 'AD' | string | null,
): SignedDateParts | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const match = /^([+-]?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(trimmed)
    if (match) {
      const rawYear = parseInt(match[1], 10)
      const month = match[2] ? parseInt(match[2], 10) : 1
      const day = match[3] ? parseInt(match[3], 10) : 1
      if (Number.isFinite(rawYear) && rawYear !== 0) {
        const isBc = rawYear < 0 || eraHint === 'BC'
        const absYear = Math.abs(rawYear)
        return {
          signedYear: isBc ? -absYear : absYear,
          absYear,
          era: isBc ? 'BC' : 'AD',
          month: Number.isFinite(month) ? month : 1,
          day: Number.isFinite(day) ? day : 1,
        }
      }
    }
  }
  const d = typeof raw === 'string' ? new Date(raw) : raw
  if (Number.isNaN(d.getTime())) return null
  const utcY = d.getUTCFullYear()
  const isBc = utcY < 0 || eraHint === 'BC'
  const absYear = Math.abs(utcY)
  return {
    signedYear: isBc ? -absYear : absYear,
    absYear,
    era: isBc ? 'BC' : 'AD',
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

/** 인물 생몰년 포맷 */
export function formatPersonLifespan(p: any): string {
  if (!p) return '생몰년 미상'
  const birthParts = parseSignedDateParts(p.birthDate, p.birthEra)
  const deathParts = parseSignedDateParts(p.deathDate, p.deathEra)
  const isBirthBc =
    p.birthEra === 'BC' ||
    (typeof p.birthYear === 'number' && p.birthYear < 0) ||
    birthParts?.era === 'BC'
  const isDeathBc =
    p.deathEra === 'BC' ||
    (typeof p.deathYear === 'number' && p.deathYear < 0) ||
    deathParts?.era === 'BC'
  const be = isBirthBc ? 'BC ' : ''
  const de = isDeathBc ? 'BC ' : ''
  const by =
    p.birthYear != null
      ? Math.abs(p.birthYear)
      : birthParts != null
        ? birthParts.absYear
        : null
  const dy =
    p.deathYear != null
      ? Math.abs(p.deathYear)
      : deathParts != null
        ? deathParts.absYear
        : null
  if (by != null && dy != null) return `${be}${by} ~ ${de}${dy}`
  if (by != null) return `${be}${by} ~`
  if (dy != null) return `~ ${de}${dy}`
  return '생몰년 미상'
}

/** 취임일 기준 나이 계산 (기원전·서기 모두 지원) */
export function calcAgeAtTenure(
  person: any,
  tenureStartDate: string | null | undefined,
): number | null {
  if (!person || !tenureStartDate) return null
  const startParts = parseSignedDateParts(tenureStartDate)
  if (!startParts) return null

  const birthParts = parseSignedDateParts(person.birthDate, person.birthEra)
  if (birthParts) {
    let age = startParts.signedYear - birthParts.signedYear
    if (
      startParts.month < birthParts.month ||
      (startParts.month === birthParts.month && startParts.day < birthParts.day)
    ) {
      age -= 1
    }
    return age >= 0 ? age : null
  }
  if (person.birthYear != null) {
    const signedBirthYear =
      person.birthEra === 'BC' ? -Math.abs(person.birthYear) : person.birthYear
    const age = startParts.signedYear - signedBirthYear
    return age >= 0 ? age : null
  }
  return null
}
