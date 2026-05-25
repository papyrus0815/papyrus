export interface CreateCompanyCategoryDto {
  /** 카테고리 명 */
  name: string
  /** 슬러그/코드 (URL·외부 참조용) */
  slug?: string
  /** 카테고리 설명 */
  description?: string
  /** 상위 카테고리 ID */
  parentId?: string
}
