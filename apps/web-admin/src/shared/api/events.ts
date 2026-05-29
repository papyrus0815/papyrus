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
 * 모든 사건 조회 (페이징 + 다축 필터).
 * 클라이언트 lens 칩(country/hcountry/category/decade/century/quality)을
 * 1:1 매핑하기 위한 옵션을 모두 받는다. 누락 검사 플래그는 true 시에만 적용.
 */
export interface GetAllEventsParams {
  offset?: number
  limit?: number
  /** 7 전달 시 createdAt이 최근 N일 이내인 사건만 반환 */
  createdSinceDays?: number
  /** (legacy) 단일 국가 — 현대/역사적 양쪽 매칭 */
  countryId?: string
  /** 현대 국가 id 다중 — OR 결합 */
  countryIds?: string[]
  /** 역사 국가 id 다중 — OR 결합 */
  historicalCountryIds?: string[]
  /** EventCategory.id 정확 매칭 */
  categoryId?: string
  /** 십년대 시작 연도 (예: 1860) */
  decade?: number
  /** 세기 (예: 19) */
  century?: number
  hasNoDescription?: boolean
  hasNoCountries?: boolean
  hasNoKeywords?: boolean
}

export async function getAllEvents(
  params?: GetAllEventsParams,
): Promise<EventResponseDto[]> {
  try {
    const connection = getConnection()
    const url = new URL(`${connection.host}/events`)
    const set = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    }
    set('offset', params?.offset)
    set('limit', params?.limit)
    set('createdSinceDays', params?.createdSinceDays)
    set('countryId', params?.countryId)
    if (params?.countryIds?.length) {
      url.searchParams.set('countryIds', params.countryIds.join(','))
    }
    if (params?.historicalCountryIds?.length) {
      url.searchParams.set(
        'historicalCountryIds',
        params.historicalCountryIds.join(','),
      )
    }
    set('categoryId', params?.categoryId)
    set('decade', params?.decade)
    set('century', params?.century)
    if (params?.hasNoDescription) url.searchParams.set('hasNoDescription', 'true')
    if (params?.hasNoCountries) url.searchParams.set('hasNoCountries', 'true')
    if (params?.hasNoKeywords) url.searchParams.set('hasNoKeywords', 'true')

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
/** 조회 실패 사유 구분용 — 페이지가 404(없음/삭제)와 일반 오류를 다르게 안내. */
export interface EventFetchError extends Error {
  status?: number
}

export async function getEventById(id: string): Promise<EventResponseDto> {
  try {
    return await api.events.getEventById(getConnection(), id)
  } catch (error) {
    // nestia HttpError는 숫자 status를 갖는다. 404는 삭제/부재로 분기.
    const status =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined
    const message =
      status === 404
        ? '삭제되었거나 존재하지 않는 사건입니다.'
        : `사건 조회 실패: ${error}`
    const e = new Error(message) as EventFetchError
    e.status = status
    throw e
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
