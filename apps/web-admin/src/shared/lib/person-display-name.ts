/**
 * 인물 이름 표시용 타입 (nameDisplayOrder에 따라 성+이름 또는 이름+성)
 */
export type PersonNameFields = {
  name: string
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
}

/**
 * 항상 "성 이름 (중간이름)" 순으로 전체 이름 문자열 반환.
 * @param omitMiddleName true면 리스트 카드용으로 중간이름 제외
 */
export function getPersonDisplayName(
  p: PersonNameFields,
  omitMiddleName?: boolean,
): string {
  const name = p.name?.trim() ?? ''
  const surname = (p.surname?.trim() ?? '') || ''
  const middle = omitMiddleName ? '' : (p.middleName?.trim() ?? '') || ''
  const parts = [surname, name, middle].filter(Boolean)
  return parts.join(' ')
}
