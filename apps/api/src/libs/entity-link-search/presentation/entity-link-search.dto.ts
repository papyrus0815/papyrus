export type EntityLinkSearchItemDto = {
  type:
    | 'person'
    | 'event'
    | 'company'
    | 'country'
    | 'historicalCountry'
    | 'dynasty'
    | 'militaryUnit'
    | 'politicalParty'
    | 'personGroup'
  id: string
  name: string
  subtitle?: string | null
  /** 정당 → 국가 상세 이동용 */
  countryId?: string | null
  /** 인물 프로필 이미지 등 — 링크 시 행위자 아바타 즉시 표시용 */
  imageUrl?: string | null
}

export interface EntityLinkSearchResponseDto {
  items: EntityLinkSearchItemDto[]
}
