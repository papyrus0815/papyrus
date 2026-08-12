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

/** 방문(놀러가기)용 사건 카드 (제목·날짜·카테고리, 읽기전용) */
export type VisitedEventCard = Awaited<
  ReturnType<typeof api.events.by_account.getEventsByAccount>
>[number]

/** 방문(놀러가기): 타 계정이 등록한 사건 카드 목록 — GET /events/by-account/:accountId */
export async function getEventsByAccount(
  accountId: string,
): Promise<VisitedEventCard[]> {
  return api.events.by_account.getEventsByAccount(getConnection(), accountId)
}

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
 * 사건 총 개수 조회 — 현재 사용자의 최상위·미삭제 사건 수(선택 필터 반영).
 *
 * getAllEvents는 배열만 반환해 total을 알 수 없어, "전체 N건"이 로드된 수에 불과했다.
 * 이 엔드포인트로 권위 있는 총량을 받는다. getAllEvents와 동일하게 raw fetch 사용
 * (별도 SDK 재생성 불필요). 서버 라우트는 `/events/count`.
 */
export async function getEventsCount(
  params?: Pick<
    GetAllEventsParams,
    | 'countryId'
    | 'countryIds'
    | 'historicalCountryIds'
    | 'categoryId'
    | 'decade'
    | 'century'
    | 'createdSinceDays'
    | 'hasNoDescription'
    | 'hasNoCountries'
    | 'hasNoKeywords'
  >,
): Promise<number> {
  try {
    const connection = getConnection()
    const url = new URL(`${connection.host}/events/count`)
    const set = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    }
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
    set('createdSinceDays', params?.createdSinceDays)
    if (params?.hasNoDescription) url.searchParams.set('hasNoDescription', 'true')
    if (params?.hasNoCountries) url.searchParams.set('hasNoCountries', 'true')
    if (params?.hasNoKeywords) url.searchParams.set('hasNoKeywords', 'true')

    const response = await fetch(url.toString(), {
      headers: (connection.headers ?? {}) as HeadersInit,
      credentials: 'include',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as { total?: number }
    return typeof data?.total === 'number' ? data.total : 0
  } catch (error) {
    throw new Error(`사건 개수 조회 실패: ${error}`)
  }
}

/**
 * 상위·하위 사건 연결 피커용 경량 후보 — GET /events/link-candidates.
 *
 * getAllEvents(목록 API)는 최상위만·100건 캡이라 연결 후보 검색에 부적합했다.
 * 이 API는 *하위 사건 포함* 본인 소유 전체를 title 부분일치로 서버 검색한다.
 * BC·고대 사건은 startDate가 null — startEra/startYear 구조화 필드로 표기할 것.
 */
export interface EventLinkCandidate {
  id: string
  title: string
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
  /** 현재 상위 사건(주 상위) — 있으면 "이미 X의 하위" 표시·재부모화 확인의 근거 */
  parentEventId?: string | null
  parentEventTitle?: string | null
  /**
   * 추가 상위 사건 목록 — 후보 배지 "현재 'X'의 하위 (+N)"의 근거.
   * 서버가 liveParent와 동일한 소프트삭제 게이트로 산출(칩·카운트 불일치 방지). 비면 미포함.
   * ⚠️ raw fetch 인터페이스라 SDK 재생성으로 안 따라온다 — 서버 DTO(EventLinkCandidateDto)와
   * 손 동기화 필수.
   */
  extraParents?: Array<{ id: string; title: string }>
}

export async function getEventLinkCandidates(params?: {
  /** 사건명 부분일치 검색어 — 비면 최근 수정순 기본 목록 */
  query?: string
  /** 기본 30, 최대 100 (서버 캡) */
  limit?: number
}): Promise<EventLinkCandidate[]> {
  try {
    const connection = getConnection()
    const url = new URL(`${connection.host}/events/link-candidates`)
    const term = params?.query?.trim()
    if (term) url.searchParams.set('q', term)
    if (params?.limit != null) url.searchParams.set('limit', String(params.limit))

    const response = await fetch(url.toString(), {
      headers: (connection.headers ?? {}) as HeadersInit,
      credentials: 'include',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as EventLinkCandidate[]
  } catch (error) {
    throw new Error(`사건 연결 후보 조회 실패: ${error}`)
  }
}

/**
 * 사건 댓글 수 조회 — GET /comments?ownerType=EVENT&recordId=<id> (JWT 필요).
 *
 * [PD4-NOTICE] 상위 지정으로 댓글이 숨는 전이(루트→하위) 직전 사전 고지용 명령형 조회 —
 * 목록 길이만 쓴다. 서버 댓글 게이트는 '살아있는 주 상위 없음'(실질 루트)만 댓글 대상으로
 * 인정하므로, 이미 하위인 사건에 호출하면 404가 난다 — 호출부는 루트일 때만 부른다.
 */
export async function getEventCommentCount(eventId: string): Promise<number> {
  const comments = await api.comments.list(getConnection(), 'EVENT', eventId)
  return comments.length
}

/**
 * 역사 속 오늘 — start_date의 월·일이 오늘과 같은 사건(연도 무관).
 * month·day는 사용자 로컬 기준으로 넘긴다(서버 TZ와 어긋남 방지). 1-based month.
 * 없으면 빈 배열.
 */
export async function getEventsOnThisDay(params?: {
  month?: number
  day?: number
  limit?: number
}): Promise<EventResponseDto[]> {
  try {
    const connection = getConnection()
    const url = new URL(`${connection.host}/events/on-this-day`)
    const set = (key: string, value: number | undefined) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    }
    set('month', params?.month)
    set('day', params?.day)
    set('limit', params?.limit)

    const response = await fetch(url.toString(), {
      headers: (connection.headers ?? {}) as HeadersInit,
      credentials: 'include',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as EventResponseDto[]
  } catch (error) {
    throw new Error(`역사 속 오늘 조회 실패: ${error}`)
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
    return await api.events.deleted.list.getDeletedEvents(getConnection())
  } catch (error) {
    throw error
  }
}

/**
 * 사건 복구
 */
export async function restoreEvent(id: string): Promise<EventResponseDto> {
  try {
    return await api.events.restore.restoreEvent(getConnection(), id)
  } catch (error) {
    throw error
  }
}

/**
 * 사건 완전 삭제
 */
export async function permanentlyDeleteEvent(id: string): Promise<void> {
  try {
    await api.events.permanent.permanentlyDeleteEvent(getConnection(), id)
  } catch (error) {
    throw error
  }
}
