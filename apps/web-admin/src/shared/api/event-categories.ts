/**
 * 이벤트 카테고리 API - Nestia SDK 기반
 */
import { functional } from '@papyrus/api-sdk'
import type { IConnection } from '@nestia/fetcher'

const api = functional

// SDK 타입 re-export
export type EventCategoryDto = Awaited<
  ReturnType<typeof api.event_categories.getAllCategories>
>[number]

const getApiHost = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (envUrl === '') {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin
  }

  if (envUrl) {
    return envUrl
  }

  return 'http://localhost:8000'
}

// SDK 연결 설정
const getConnection = (): IConnection => ({
  host: getApiHost(),
})

export async function getAllEventCategories(): Promise<EventCategoryDto[]> {
  try {
    return await api.event_categories.getAllCategories(getConnection())
  } catch {
    throw new Error('Failed to fetch event categories')
  }
}
