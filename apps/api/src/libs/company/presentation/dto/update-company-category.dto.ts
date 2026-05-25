export interface UpdateCompanyCategoryDto {
  /** 카테고리 명 */
  name?: string
  /** 슬러그/코드 (URL·외부 참조용) */
  slug?: string | null
  /** 카테고리 설명 */
  description?: string | null
  /** 상위 카테고리 ID (null로 최상위 전환) */
  parentId?: string | null
}
