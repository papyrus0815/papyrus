/**
 * 국가 지표 API 서비스 (경제·인구·발전)
 * Nestia SDK 기반 타입 안전 조회 래퍼.
 *
 * 백엔드: GET /countries/:id/{economic|demographic|development}-indicators
 */

import * as countriesApi from '@api/functional/countries'
import { getApiConnection } from './client'

// SDK가 생성한 응답 타입 재사용
export type EconomicIndicator = Awaited<
  ReturnType<
    typeof countriesApi.economic_indicators.getEconomicIndicators
  >
>[number]
export type DemographicIndicator = Awaited<
  ReturnType<
    typeof countriesApi.demographic_indicators.getDemographicIndicators
  >
>[number]
export type DevelopmentIndicator = Awaited<
  ReturnType<
    typeof countriesApi.development_indicators.getDevelopmentIndicators
  >
>[number]

// SDK가 생성한 입력(upsert) 타입 재사용
export type UpsertEconomicIndicatorInput = Parameters<
  typeof countriesApi.economic_indicators.upsertEconomicIndicator
>[2]
export type UpsertDemographicIndicatorInput = Parameters<
  typeof countriesApi.demographic_indicators.upsertDemographicIndicator
>[2]
export type UpsertDevelopmentIndicatorInput = Parameters<
  typeof countriesApi.development_indicators.upsertDevelopmentIndicator
>[2]

export interface IndicatorYearRange {
  startYear?: number
  endYear?: number
}

function toQuery(range?: IndicatorYearRange) {
  return {
    startYear: range?.startYear != null ? String(range.startYear) : undefined,
    endYear: range?.endYear != null ? String(range.endYear) : undefined,
  }
}

// TransformInterceptor로 래핑된 응답({ data })에서 배열을 추출
function unwrap<T>(response: unknown): T[] {
  const r = response as { data?: T[] } | T[]
  if (Array.isArray(r)) return r
  return r?.data ?? []
}

// TransformInterceptor 래핑({ data })에서 단일 객체 추출
function unwrapOne<T>(response: unknown): T {
  const r = response as { data?: T } | T
  if (r && typeof r === 'object' && 'data' in (r as object)) {
    const inner = (r as { data?: T }).data
    if (inner !== undefined) return inner
  }
  return r as T
}

/** 경제 지표 조회 */
export async function getEconomicIndicators(
  countryId: string,
  range?: IndicatorYearRange,
): Promise<EconomicIndicator[]> {
  const response = await countriesApi.economic_indicators.getEconomicIndicators(
    getApiConnection(),
    countryId,
    toQuery(range),
  )
  return unwrap<EconomicIndicator>(response)
}

/** 인구 지표 조회 */
export async function getDemographicIndicators(
  countryId: string,
  range?: IndicatorYearRange,
): Promise<DemographicIndicator[]> {
  const response =
    await countriesApi.demographic_indicators.getDemographicIndicators(
      getApiConnection(),
      countryId,
      toQuery(range),
    )
  return unwrap<DemographicIndicator>(response)
}

/** 발전 지표 조회 */
export async function getDevelopmentIndicators(
  countryId: string,
  range?: IndicatorYearRange,
): Promise<DevelopmentIndicator[]> {
  const response =
    await countriesApi.development_indicators.getDevelopmentIndicators(
      getApiConnection(),
      countryId,
      toQuery(range),
    )
  return unwrap<DevelopmentIndicator>(response)
}

// ── 쓰기 (upsert / delete) ───────────────────────────────────

/** 경제 지표 생성/갱신 (year 기준) */
export async function upsertEconomicIndicator(
  countryId: string,
  dto: UpsertEconomicIndicatorInput,
): Promise<EconomicIndicator> {
  const response =
    await countriesApi.economic_indicators.upsertEconomicIndicator(
      getApiConnection(),
      countryId,
      dto,
    )
  return unwrapOne<EconomicIndicator>(response)
}

/** 경제 지표 삭제 (year) */
export async function deleteEconomicIndicator(
  countryId: string,
  year: number,
): Promise<void> {
  await countriesApi.economic_indicators.deleteEconomicIndicator(
    getApiConnection(),
    countryId,
    year,
  )
}

/** 인구 지표 생성/갱신 (year 기준) */
export async function upsertDemographicIndicator(
  countryId: string,
  dto: UpsertDemographicIndicatorInput,
): Promise<DemographicIndicator> {
  const response =
    await countriesApi.demographic_indicators.upsertDemographicIndicator(
      getApiConnection(),
      countryId,
      dto,
    )
  return unwrapOne<DemographicIndicator>(response)
}

/** 인구 지표 삭제 (year) */
export async function deleteDemographicIndicator(
  countryId: string,
  year: number,
): Promise<void> {
  await countriesApi.demographic_indicators.deleteDemographicIndicator(
    getApiConnection(),
    countryId,
    year,
  )
}

/** 발전 지표 생성/갱신 (year 기준) */
export async function upsertDevelopmentIndicator(
  countryId: string,
  dto: UpsertDevelopmentIndicatorInput,
): Promise<DevelopmentIndicator> {
  const response =
    await countriesApi.development_indicators.upsertDevelopmentIndicator(
      getApiConnection(),
      countryId,
      dto,
    )
  return unwrapOne<DevelopmentIndicator>(response)
}

/** 발전 지표 삭제 (year) */
export async function deleteDevelopmentIndicator(
  countryId: string,
  year: number,
): Promise<void> {
  await countriesApi.development_indicators.deleteDevelopmentIndicator(
    getApiConnection(),
    countryId,
    year,
  )
}
