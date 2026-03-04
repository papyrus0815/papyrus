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
 * countryId: 현대 국가 또는 역사적 국가 ID로 연관 사건만 조회
 */
export async function getAllEvents(params?: {
  offset?: number
  limit?: number
  /** 일주일만: 7 전달 시 createdAt이 최근 N일 이내인 사건만 반환 */
  createdSinceDays?: number
  /** 연관 국가(현대/역사적) ID로 필터 */
  countryId?: string
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
    if (params?.createdSinceDays !== undefined) {
      url.searchParams.set('createdSinceDays', params.createdSinceDays.toString())
    }
    if (params?.countryId) {
      url.searchParams.set('countryId', params.countryId)
    }

    const response = await fetch(url.toString(), {
      headers: (connection.headers ?? {}) as HeadersInit,
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
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
    return await api.events.createEvent(getConnection(), dto)
  } catch (error) {
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
    return await api.events.updateEvent(getConnection(), id, dto)
  } catch (error) {
    throw error
  }
}

/**
 * 사건 삭제 (소프트 삭제)
 */
export async function deleteEvent(id: string): Promise<void> {
  try {
    await api.events.deleteEvent(getConnection(), id)
  } catch (error) {
    throw new Error(`사건 삭제 실패: ${error}`)
  }
}

/**
 * 삭제된 사건 목록 조회
 */
export async function getDeletedEvents(): Promise<EventResponseDto[]> {
  try {
    return await api.events.deleted.list(getConnection())
  } catch (error) {
    throw error
  }
}

/**
 * 사건 복구
 */
export async function restoreEvent(id: string): Promise<EventResponseDto> {
  try {
    return await api.events.$id(id).restore(getConnection())
  } catch (error) {
    throw error
  }
}

/**
 * 사건 완전 삭제
 */
export async function permanentlyDeleteEvent(id: string): Promise<void> {
  try {
    await api.events.$id(id).permanent.deleteEvent(getConnection())
  } catch (error) {
    throw error
  }
}
