/**
 * GET /persons/search 응답 원소 — 인물 피커용 경량 이름 검색.
 * (nestia SDK는 이름 있는 반환 타입만 생성한다 — 인라인 객체 타입이면 build:nestia가 실패)
 */
export interface PersonSearchItemDto {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  originalName: string | null
  nameDisplayOrder: string | null
  country: { defaultNameDisplayOrder: string | null } | null
}
