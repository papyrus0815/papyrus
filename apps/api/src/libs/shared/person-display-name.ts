/**
 * 인물 표시명 — 프론트 getPersonDisplayName과 같은 순서 규칙(서버 단일 출처).
 * 우선순위: 개인 오버라이드 → 국가 기본 → 동양식. 중간이름은 이름 묶음에 붙는다
 * (western: 이름 중간 성 / korean: 성 이름 중간).
 */
export function displayPersonName(person: {
  name: string
  surname: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  country?: { defaultNameDisplayOrder?: string | null } | null
}): string {
  const resolved = person.nameDisplayOrder ?? person.country?.defaultNameDisplayOrder
  const order: 'western' | 'korean' = resolved === 'western' ? 'western' : 'korean'
  const parts =
    order === 'western'
      ? [person.name, person.middleName, person.surname]
      : [person.surname, person.name, person.middleName]
  return parts.filter(Boolean).join(' ').trim() || person.name
}
