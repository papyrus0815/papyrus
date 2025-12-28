/**
 * 카테고리 표시 관련 유틸리티
 * FSD: features/event-create/lib
 */

/**
 * 카테고리 ID에서 타입 키워드 추출
 *
 * @example
 * extractCategoryKey('cat-military-001') → 'military'
 * extractCategoryKey('cat-diplomatic-002') → 'diplomatic'
 */
export const extractCategoryKey = (categoryId?: string): string => {
  if (!categoryId) return 'other'

  // ID 형식: cat-{type}-{number}
  const match = categoryId.match(/cat-(\w+)-/)

  if (match && match[1]) {
    return match[1] // 'military', 'diplomatic', etc.
  }

  return 'other'
}
