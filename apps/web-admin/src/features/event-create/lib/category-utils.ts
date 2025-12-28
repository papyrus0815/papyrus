/**
 * 카테고리 판단 유틸리티 (키워드 기반)
 * FSD: features/event-create/lib
 *
 * DB ID 네이밍 규칙: cat-{type}-{number}
 * 예: cat-military-001, cat-diplomatic-001
 */

/**
 * 카테고리가 군사 카테고리인지 확인
 */
export const isMilitaryCategory = (categoryId?: string): boolean => {
  return categoryId?.includes('military') ?? false
}

/**
 * 카테고리가 외교/회담 카테고리인지 확인
 */
export const isDiplomaticCategory = (categoryId?: string): boolean => {
  if (!categoryId) return false
  return categoryId.includes('diplomatic') || categoryId.includes('conference')
}

/**
 * 카테고리가 회담 카테고리인지 확인
 */
export const isConferenceCategory = (categoryId?: string): boolean => {
  return categoryId?.includes('conference') ?? false
}
