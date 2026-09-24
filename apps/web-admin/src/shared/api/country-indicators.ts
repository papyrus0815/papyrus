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

/**
 * 국채 금리 — 연도 하나에 만기 수만큼 행이 있다(수익률 곡선의 점들).
 * 그래서 키가 (year, maturity)이고 삭제도 둘을 함께 받는다.
 */
export type BondYield = Awaited<
  ReturnType<typeof countriesApi.bond_yields.getBondYields>
>[number]
export type UpsertBondYieldInput = Parameters<
  typeof countriesApi.bond_yields.upsertBondYield
>[2]
export type BondMaturity = BondYield['maturity']

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

// ── 국채 금리 ────────────────────────────────────────────────

/** 국채 금리 조회 (연도 오름차순 · 만기 짧은 순) */
export async function getBondYields(
  countryId: string,
  range?: IndicatorYearRange,
): Promise<BondYield[]> {
  const response = await countriesApi.bond_yields.getBondYields(
    getApiConnection(),
    countryId,
    toQuery(range),
  )
  return unwrap<BondYield>(response)
}

/** 국채 금리 생성/갱신 (year + maturity 기준) */
export async function upsertBondYield(
  countryId: string,
  dto: UpsertBondYieldInput,
): Promise<BondYield> {
  const response = await countriesApi.bond_yields.upsertBondYield(
    getApiConnection(),
    countryId,
    dto,
  )
  return unwrapOne<BondYield>(response)
}

/** 국채 금리 삭제 (year + maturity) */
export async function deleteBondYield(
  countryId: string,
  year: number,
  maturity: BondMaturity,
): Promise<void> {
  await countriesApi.bond_yields.deleteBondYield(
    getApiConnection(),
    countryId,
    year,
    maturity,
  )
}
