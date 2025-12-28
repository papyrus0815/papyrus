/**
 * 이벤트 목록 카테고리 헬퍼
 * FSD: features/event-list/lib
 */
import type { EventCategoryDto } from '@/shared/api/event-categories'

/**
 * 카테고리 키로 이름 찾기
 * @param categoryKey 'military', 'diplomatic' 등
 * @param dbCategories DB 카테고리 목록
 */
export const getCategoryName = (
  categoryKey: string,
  dbCategories: EventCategoryDto[],
): string => {
  // categoryKey → ID 패턴: cat-{key}-*
  const category = dbCategories.find((cat) => cat.id.includes(categoryKey))

  return category?.name || categoryKey
}

/**
 * 카테고리 ID로 이름 찾기
 */
export const getCategoryNameById = (
  categoryId: string,
  dbCategories: EventCategoryDto[],
): string => {
  const category = dbCategories.find((cat) => cat.id === categoryId)
  return category?.name || '알 수 없음'
}
