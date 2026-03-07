/**
 * 이벤트 카테고리 API - Nestia SDK 기반
 */
import { functional } from '@papyrus/api-sdk'

import { getApiConnection } from './client'

const api = functional

// SDK 타입 re-export
export type EventCategoryDto = Awaited<
  ReturnType<typeof api.event_categories.getAllCategories>
>[number]

export async function getAllEventCategories(): Promise<EventCategoryDto[]> {
  try {
    return await api.event_categories.getAllCategories(getApiConnection())
  } catch {
    throw new Error('Failed to fetch event categories')
  }
}
