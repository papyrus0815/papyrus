/**
 * 사건 API - Nestia SDK 기반
 */
import { functional } from '@papyrus/api-sdk'
import type { IConnection } from '@nestia/fetcher'

const api = functional

// SDK 타입 re-export + sectionTitles 추가
export type EventResponseDto = Awaited<
  ReturnType<typeof api.events.getEventById>
> & {
  sectionTitles?: string[] // 추가된 필드
}

export type CreateEventDto = Parameters<typeof api.events.createEvent>[1]
export type UpdateEventDto = Parameters<typeof api.events.updateEvent>[2]

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

/**
 * 모든 사건 조회
 */
export async function getAllEvents(): Promise<EventResponseDto[]> {
  try {
    return await api.events.getAllEvents(getConnection())
  } catch (error) {
    console.error('❌ 사건 목록 조회 실패:', error)
    throw new Error(`사건 목록 조회 실패: ${error}`)
  }
}

/**
 * ID로 사건 조회
 */
export async function getEventById(id: string): Promise<EventResponseDto> {
  try {
    return await api.events.getEventById(getConnection(), id)
  } catch (error) {
    console.error('❌ 사건 조회 실패:', error)
    throw new Error(`사건 조회 실패: ${error}`)
  }
}

/**
 * 상위 사건의 하위 사건 목록 조회
 */
export async function getEventsByParentId(
  parentEventId: string,
): Promise<EventResponseDto[]> {
  try {
    return await api.events.parent.getEventsByParentId(
      getConnection(),
      parentEventId,
    )
  } catch (error) {
    console.error('❌ 하위 사건 목록 조회 실패:', error)
    throw new Error(`하위 사건 목록 조회 실패: ${error}`)
  }
}

/**
 * 사건 생성
 */
export async function createEvent(
  dto: CreateEventDto,
): Promise<EventResponseDto> {
  try {
    console.log('📤 사건 생성 요청:', dto)
    const result = await api.events.createEvent(getConnection(), dto)
    console.log('✅ 사건 생성 성공:', result)
    return result
  } catch (error) {
    console.error('❌ 사건 생성 실패:', error)
    throw error
  }
}

/**
 * 사건 수정
 */
export async function updateEvent(
  id: string,
  dto: UpdateEventDto,
): Promise<EventResponseDto> {
  try {
    console.log('📤 사건 수정 요청:', { id, dto })
    const result = await api.events.updateEvent(getConnection(), id, dto)
    console.log('✅ 사건 수정 성공:', result)
    return result
  } catch (error) {
    console.error('❌ 사건 수정 실패:', error)
    throw error
  }
}

/**
 * 사건 삭제
 */
export async function deleteEvent(id: string): Promise<void> {
  try {
    await api.events.deleteEvent(getConnection(), id)
    console.log('✅ 사건 삭제 성공:', id)
  } catch (error) {
    console.error('❌ 사건 삭제 실패:', error)
    throw new Error(`사건 삭제 실패: ${error}`)
  }
}
