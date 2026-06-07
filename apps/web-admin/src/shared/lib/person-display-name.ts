/**
 * 인물 이름 표시용 타입
 * 표시 순서 우선순위: 인물 개인 `nameDisplayOrder`(예외 오버라이드) → 소속 국가
 * `country.defaultNameDisplayOrder`(또는 페이지가 넘긴 옵션) → 기본(동양식 성+이름).
 */
export type PersonNameFields = {
  name: string
  surname?: string | null
  middleName?: string | null
  /** 군주명 (재위명). 있으면 UI에서 별도 표시 */
  regnalName?: string | null
  /** 개인 표시 순서 오버라이드. 설정 시 국가 기본보다 우선 */
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
  // 1. 개인 오버라이드 (가장 구체적 — 귀화·혼합·예외 인물)
  const fromPerson = p.nameDisplayOrder
  if (fromPerson === 'western') return 'western'
  if (fromPerson === 'korean') return 'korean'
  // 2. 페이지가 넘긴 국가 옵션 (목록에 person.country가 없을 때)
  const fromOption = options?.countryDefaultNameDisplayOrder
  if (fromOption !== undefined && fromOption !== null) {
    return fromOption === 'western' ? 'western' : 'korean'
  }
  // 3. 소속 국가 기본
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
