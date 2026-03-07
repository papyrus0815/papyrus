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
 * nameDisplayOrder에 따라 "성 이름" 또는 "이름 성" 순으로 전체 이름 반환.
 * korean(기본): 성 + 이름 + 중간이름
 * western: 이름 + 중간이름 + 성
 * @param omitMiddleName true면 리스트 카드용으로 중간이름 제외
 */
export function getPersonDisplayName(
  p: PersonNameFields,
  omitMiddleName?: boolean,
): string {
  const name = p.name?.trim() ?? ''
  const surname = (p.surname?.trim() ?? '') || ''
  const middle = omitMiddleName ? '' : (p.middleName?.trim() ?? '') || ''
  const order = p.nameDisplayOrder === 'western' ? 'western' : 'korean'
  const parts = order === 'western' ? [name, middle, surname] : [surname, name, middle]
  return parts.filter(Boolean).join(' ')
}
