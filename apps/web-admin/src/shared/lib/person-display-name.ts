/**
 * 인물 이름 표시용 타입
 * - 표시 순서는 현재 **소속 국가(`country.defaultNameDisplayOrder`)만** 사용한다.
 * - 인물의 `nameDisplayOrder` 컬럼은 나중에 예외 처리용으로 남겨 두고, UI 표시에는 쓰지 않는다.
 */
export type PersonNameFields = {
  name: string
  surname?: string | null
  middleName?: string | null
  /** 사용 안 함(표시). 국가 기본만 사용 */
  nameDisplayOrder?: string | null
  country?: {
    defaultNameDisplayOrder?: string | null
    isoCode?: string | null
  } | null
}

export type GetPersonDisplayNameOptions = {
  omitMiddleName?: boolean
  /**
   * `person.country`가 없을 때 (예: 목록에 국가 미포함).
   * 현재 페이지의 국가 설정을 넘기면 그 순서로 표시.
   */
  countryDefaultNameDisplayOrder?: string | null
}

function resolveOrder(
  p: PersonNameFields,
  options?: GetPersonDisplayNameOptions,
): 'western' | 'korean' {
  const fromOption = options?.countryDefaultNameDisplayOrder
  if (fromOption !== undefined && fromOption !== null) {
    return fromOption === 'western' ? 'western' : 'korean'
  }
  const fromCountry = p.country?.defaultNameDisplayOrder
  if (fromCountry === 'western') return 'western'
  if (fromCountry === 'korean') return 'korean'
  /** null·미설정: Prisma·국가 폼과 동일 — 동양식(성→이름). ISO 추정은 사용하지 않음 */
  return 'korean'
}

/**
 * 국가 기본(`country.defaultNameDisplayOrder`)에 따라 성·이름 또는 이름·성 순으로 전체 이름 반환.
 * korean: 성 + 이름 + 중간이름 / western: 이름 + 중간이름 + 성
 * @param omitMiddleName true면 리스트 카드용으로 중간이름 제외 (옵션 객체에 넣거나 두 번째 인자로 true)
 */
export function getPersonDisplayName(
  p: PersonNameFields,
  options?: boolean | GetPersonDisplayNameOptions,
): string {
  const opts: GetPersonDisplayNameOptions =
    typeof options === 'boolean' ? { omitMiddleName: options } : (options ?? {})
  const omitMiddle = opts.omitMiddleName ?? false
  const name = p.name?.trim() ?? ''
  const surname = (p.surname?.trim() ?? '') || ''
  const middle = omitMiddle ? '' : (p.middleName?.trim() ?? '') || ''
  const order = resolveOrder(p, opts)
  const parts =
    order === 'western' ? [name, middle, surname] : [surname, name, middle]
  return parts.filter(Boolean).join(' ')
}
