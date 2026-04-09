export type EntityLinkSearchItemDto = {
  type:
    | 'person'
    | 'event'
    | 'country'
    | 'historicalCountry'
    | 'dynasty'
    | 'militaryUnit'
    | 'politicalParty'
  id: string
  name: string
  subtitle?: string | null
  /** 정당 → 국가 상세 이동용 */
  countryId?: string | null
}

export interface EntityLinkSearchResponseDto {
  items: EntityLinkSearchItemDto[]
}
