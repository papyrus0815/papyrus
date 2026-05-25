/** 응답에 포함되는 상위 카테고리 요약 */
export interface CompanyCategoryParentSummary {
  id: string
  name: string
}

export interface CompanyCategoryResponseDto {
  id: string
  /** 카테고리 명 */
  name: string
  /** 슬러그/코드 (URL·외부 참조용) */
  slug: string | null
  /** 카테고리 설명 */
  description: string | null
  /** 상위 카테고리 ID */
  parentId: string | null
  /** 상위 카테고리 요약 */
  parent: CompanyCategoryParentSummary | null
  /** 하위 카테고리 수 */
  childrenCount: number
  /** 이 카테고리에 연결된 기업 수 */
  companyCount: number
  createdAt: string
  updatedAt: string
}
