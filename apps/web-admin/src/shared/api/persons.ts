/**
 * 인물 API 서비스
 * Nestia SDK를 사용한 타입 안전한 인물 CRUD
 */
import * as governmentPositions from '@api/functional/government_positions'
import * as personsApi from '@api/functional/persons'

import { getApiConnection } from './client'

// SDK에서 생성된 타입 사용
export type PersonResponseDto = Awaited<
  ReturnType<typeof personsApi.getAll>
>[number]
/** 인포그래픽 목록(경량) 아이템 — adapt가 쓰는 최소 필드만 */
export type PersonInfographicItemDto = Awaited<
  ReturnType<typeof personsApi.infographic.getAllForInfographic>
>[number]
/** SDK 원시 입력 타입 (Primitive<서버 DTO>) — 외부에는 아래 완화 타입을 노출 */
type SdkCreatePersonDto = Parameters<typeof personsApi.create>[1]
type SdkUpdatePersonDto = Parameters<typeof personsApi.update>[2]

/** 기원 — 폼 상태와 호환되는 문자열 리터럴 (서버 Era enum 미러) */
export type Era = 'BC' | 'AD'

/** 서버 DateInfoDto 미러 — era는 문자열 리터럴 */
export interface DateInfoInput {
  era: Era
  year: number
  month?: number
  day?: number
}

/** 서버 SpouseRelationDto 미러 — note는 런타임에서 null 수용(@IsOptional) */
export interface SpouseRelationInput {
  spouseId: string
  /** 구조화 혼인 시작 — BC·연단위 (서버 DateInfoDto). 폼은 문자열 채널을 쓰고 payload 빌드에서 변환 */
  marriageStart?: DateInfoInput | null
  marriageEnd?: DateInfoInput | null
  /** 혼인 서열/형태 (MarriageRank 토큰 — PRIMARY·CONCUBINE 등). null = 미분류 */
  marriageRank?: string | null
  /**
   * 폼 행 상태 겸 레거시 채널 — 부분 정밀 부호 문자열('1526'·'1526-03'·'-0044-03-15').
   * shared/lib/partial-date-string 헬퍼로 파싱·조립. payload에서는 구조화 marriageStart로 변환 전송.
   */
  marriageStartDate?: string
  marriageEndDate?: string
  note?: string | null
}

/** 서버 NicknameDto 미러 — type은 폼 호환 string (서버 NicknameType enum, @IsEnum 검증) */
export interface NicknameInput {
  nickname: string
  type?: string
  priority?: number
  reason?: string | null
}

/** 서버 CountryAffiliationDto 미러 — affiliationType은 폼 호환 string */
export interface CountryAffiliationInput {
  affiliationType: string
  countryId?: string
  historicalCountryId?: string
  startDate?: string
  endDate?: string
  /** 우선순위 (낮을수록 우선, 0은 주 국적 슬롯 — 추가 소속은 1 이상) */
  priority?: number
  note?: string
}

/**
 * 입력 payload 완화 필드 — 서버 class-validator가 런타임에 null을 수용(@IsOptional/@ValidateIf)
 * 하거나, enum·중첩 DTO가 폼 상태(string 리터럴)와 어긋나는 필드만 골라 완화.
 * null = 명시적 해제(수정) 또는 빈값 저장 의도. PATCH 계약: undefined = 변경 없음, null = 해제.
 */
interface RelaxedPersonInputFields {
  surname?: string | null
  middleName?: string | null
  gender?: string | null
  profileImageUrl?: string | null
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  deathType?: string | null
  birthEra?: Era
  deathEra?: Era
  /** 활동시기(floruit) 기원 — 폼 Era 리터럴로 완화. null = 해제(floruit 연도 없음) */
  floruitEra?: Era | null
  /** 수정 시 null = 출생일·기원(birthDate·birthEra) 해제 */
  birth?: DateInfoInput | null
  /** 수정 시 null = 사망일·기원(deathDate·deathEra) 해제 */
  death?: DateInfoInput | null
  spouseRelations?: SpouseRelationInput[]
  countryAffiliations?: CountryAffiliationInput[]
  nicknames?: NicknameInput[]
  sections?: Array<{
    title: string
    content: string
    order?: number
    sectionType?: string | null
  }>
}

/**
 * 프론트 입력 타입 — SDK Primitive 타입에서 위 필드만 완화.
 * SDK 타입과의 차이는 호출부 단언으로 통과 (shared/api/person/index.ts와 동일 패턴).
 */
export type CreatePersonDto = Omit<
  SdkCreatePersonDto,
  keyof RelaxedPersonInputFields
> &
  RelaxedPersonInputFields
export type UpdatePersonDto = Omit<
  SdkUpdatePersonDto,
  keyof RelaxedPersonInputFields
> &
  RelaxedPersonInputFields & {
    /**
     * 낙관적 동시성 토큰(CC1) — 마지막으로 본 상세의 updatedAt(ISO). 서버가 현재
     * updatedAt과 비교해 불일치면 409(다른 세션이 먼저 저장). SDK 타입엔 아직
     * 없지만(nestia 미재생성) 서버 DTO에 존재하므로 런타임 캐스팅으로 전달된다.
     */
    expectedUpdatedAt?: string
  }

/**
 * 모든 인물 조회
 */
export async function getAllPersons(): Promise<PersonResponseDto[]> {
  const response = (await personsApi.getAll(getApiConnection())) as any
  return response.data || response
}

/**
 * 방문(놀러가기): 타 계정이 등록한 인물 목록(카드, 읽기전용) — GET /persons/by-account/:accountId
 */
export async function getPersonsByAccount(
  accountId: string,
): Promise<PersonResponseDto[]> {
  return (await personsApi.by_account.getByAccount(
    getApiConnection(),
    accountId,
  )) as PersonResponseDto[]
}

/**
 * 인포그래픽 목록(경량) 조회 — 대시보드 인포그래픽 전용.
 * 전체 인물 payload(countryAffiliations·재임 상세 등) 대신 adapt에 필요한 필드만 받음.
 */
export async function getInfographicPersons(): Promise<
  PersonInfographicItemDto[]
> {
  const data = await personsApi.infographic.getAllForInfographic(
    getApiConnection(),
  )
  return Array.isArray(data) ? data : []
}

/**
 * 해당 국가(또는 연결된 역사적 국가)에 재임 기록이 있는 인물만 조회 (SDK)
 */
export async function getPersonsByTenureCountry(params: {
  countryId?: string
  historicalCountryId?: string
}): Promise<PersonResponseDto[]> {
  const { countryId, historicalCountryId } = params
  if (!countryId && !historicalCountryId) return []
  const conn = getApiConnection()
  if (countryId) {
    const data =
      await governmentPositions.countries.persons.getPersonsByCountryId(
        conn,
        countryId,
      )
    return Array.isArray(data) ? data : []
  }
  const data =
    await governmentPositions.historical_countries.persons.getPersonsByHistoricalCountryId(
      conn,
      historicalCountryId!,
    )
  return Array.isArray(data) ? data : []
}

/**
 * 인물 상세 조회
 */
export async function getPersonById(id: string): Promise<PersonResponseDto> {
  const response = (await personsApi.getById(getApiConnection(), id)) as any
  return response.data || response
}

/**
 * 인물 생성
 */
export async function createPerson(
  data: CreatePersonDto,
): Promise<PersonResponseDto> {
  // 완화 타입(null 허용)과 SDK Primitive 타입의 차이는 단언으로 통과 — 런타임은 class-validator가 수용.
  const response = (await personsApi.create(
    getApiConnection(),
    data as unknown as SdkCreatePersonDto,
  )) as any
  return response.data || response
}

/**
 * 인물 수정
 */
export async function updatePerson(
  id: string,
  data: UpdatePersonDto,
): Promise<PersonResponseDto> {
  const response = (await personsApi.update(
    getApiConnection(),
    id,
    data as unknown as SdkUpdatePersonDto,
  )) as any
  return response.data || response
}

/**
 * 인물 삭제
 */
export async function deletePerson(id: string): Promise<void> {
  await personsApi._delete(getApiConnection(), id)
}

/**
 * 모든 인물 조회 (정부 직책 포함) — SDK
 */
export async function getAllPersonsWithGovernmentPositions(): Promise<any[]> {
  const conn = getApiConnection()
  const data =
    await personsApi.with_government_positions.getAllWithGovernmentPositions(
      conn,
    )
  return Array.isArray(data) ? data : []
}

export type ModernCountryPersonCountRow = {
  countryId: string
  count: number
}

async function personsRequestJson<T>(path: string): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (conn.headers) {
    for (const [headerKey, headerValue] of Object.entries(conn.headers)) {
      if (headerValue != null && headerValue !== '')
        headers.set(headerKey, String(headerValue))
    }
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(url, {
    method: 'GET',
    headers,
    credentials: conn.options?.credentials ?? 'include',
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.text()
      if (body) msg = body
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

/**
 * 대시보드용: 현대 국가별 연결 인물 수 (국가 상세「전체 인물」과 동일 합집합)
 */
export async function getModernCountryPersonCounts(): Promise<
  ModernCountryPersonCountRow[]
> {
  const data = await personsRequestJson<ModernCountryPersonCountRow[]>(
    '/persons/dashboard/person-counts-by-modern-country',
  )
  return Array.isArray(data) ? data : []
}
