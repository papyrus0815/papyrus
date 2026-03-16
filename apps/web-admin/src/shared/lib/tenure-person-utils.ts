/** 인물 생몰년 포맷 */
export function formatPersonLifespan(p: any): string {
  if (!p) return '생몰년 미상'
  const be = p.birthEra === 'BC' ? 'BC ' : ''
  const de = p.deathEra === 'BC' ? 'BC ' : ''
  const by =
    p.birthYear != null
      ? p.birthYear
      : p.birthDate
        ? new Date(p.birthDate).getFullYear()
        : null
  const dy =
    p.deathYear != null
      ? p.deathYear
      : p.deathDate
        ? new Date(p.deathDate).getFullYear()
        : null
  if (by != null && dy != null) return `${be}${by} ~ ${de}${dy}`
  if (by != null) return `${be}${by} ~`
  if (dy != null) return `~ ${de}${dy}`
  return '생몰년 미상'
}

/** 취임일 기준 나이 계산 */
export function calcAgeAtTenure(
  person: any,
  tenureStartDate: string | null | undefined,
): number | null {
  if (!person || !tenureStartDate) return null
  const startYear = new Date(tenureStartDate).getFullYear()
  const startMonth = new Date(tenureStartDate).getMonth() + 1
  const startDay = new Date(tenureStartDate).getDate()
  if (person.birthDate) {
    const bd = new Date(person.birthDate)
    let age = startYear - bd.getFullYear()
    if (
      startMonth < bd.getMonth() + 1 ||
      (startMonth === bd.getMonth() + 1 && startDay < bd.getDate())
    )
      age -= 1
    return age >= 0 ? age : null
  }
  if (person.birthYear != null) {
    const age = startYear - person.birthYear
    return age >= 0 ? age : null
  }
  return null
}
