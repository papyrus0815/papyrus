/**
 * 사건 API - Nestia SDK 기반
 */
import { functional } from '@papyrus/api-sdk'

import { nestiaApiService } from './api.service'

const api = functional

// SDK 타입 re-export + sectionTitles 추가
export type EventResponseDto = Awaited<
  ReturnType<typeof api.events.getEventById>
> & {
  sectionTitles?: string[] // 추가된 필드
}

export type CreateEventDto = Parameters<typeof api.events.createEvent>[1]
export type UpdateEventDto = Parameters<typeof api.events.updateEvent>[2]

// 인증 토큰이 포함된 연결 사용 (POST/PUT/DELETE 시 401 방지)
const getConnection = () => nestiaApiService.getConnection()

/**
 * 모든 사건 조회 (페이징 지원)
 */
export async function getAllEvents(params?: {
  offset?: number
  limit?: number
}): Promise<EventResponseDto[]> {
  try {
    const connection = getConnection()
    const url = new URL(`${connection.host}/events`)
    if (params?.offset !== undefined) {
      url.searchParams.set('offset', params.offset.toString())
    }
    if (params?.limit !== undefined) {
      url.searchParams.set('limit', params.limit.toString())
    }

    console.log(`📡 사건 목록 요청: ${url.toString()}`)

    const response = await fetch(url.toString(), {
      headers: (connection.headers ?? {}) as HeadersInit,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ ${data.length}개 사건 수신`)
    return data
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
 * 사건 삭제 (소프트 삭제)
 */
export async function deleteEvent(id: string): Promise<void> {
  try {
    await api.events.deleteEvent(getConnection(), id)
    console.log('✅ 사건 삭제 성공 (3일 간 보관):', id)
  } catch (error) {
    console.error('❌ 사건 삭제 실패:', error)
    throw new Error(`사건 삭제 실패: ${error}`)
  }
}

/**
 * 삭제된 사건 목록 조회
 */
export async function getDeletedEvents(): Promise<EventResponseDto[]> {
  try {
    const result = await api.events.deleted.list(getConnection())
    console.log('✅ 삭제된 사건 목록 조회:', result.length)
    return result
  } catch (error) {
    console.error('❌ 삭제된 사건 조회 실패:', error)
    throw error
  }
}

/**
 * 사건 복구
 */
export async function restoreEvent(id: string): Promise<EventResponseDto> {
  try {
    const result = await api.events.$id(id).restore(getConnection())
    console.log('✅ 사건 복구 성공:', id)
    return result
  } catch (error) {
    console.error('❌ 사건 복구 실패:', error)
    throw error
  }
}

/**
 * 사건 완전 삭제
 */
export async function permanentlyDeleteEvent(id: string): Promise<void> {
  try {
    await api.events.$id(id).permanent.deleteEvent(getConnection())
    console.log('✅ 사건 완전 삭제 성공:', id)
  } catch (error) {
    console.error('❌ 사건 완전 삭제 실패:', error)
    throw error
  }
}
