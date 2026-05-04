/**
 * 리스트 → 상세 진입 시 헤더를 즉시 그릴 수 있도록 카드 데이터를 메모리에 보관.
 * route param URL 직렬화를 피하면서 한 화면 내에서만 유효하면 충분.
 */

import type { PersonListItem } from './dto'

const personPreviews = new Map<string, PersonListItem>()

export function setPersonPreview(item: PersonListItem) {
  personPreviews.set(item.id, item)
}

export function getPersonPreview(id: string): PersonListItem | null {
  return personPreviews.get(id) ?? null
}
