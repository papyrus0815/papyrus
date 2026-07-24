import * as dynastiesApi from '@api/functional/dynasties'
import * as dynastyDetailApi from '@api/functional/dynasties/detail'
import * as dynastyHistoricalRulesApi from '@api/functional/dynasties/historical_rules'
import * as dynastyModernRulesApi from '@api/functional/dynasties/modern_rules'
import type { DateInfoInput } from '../persons'
import { apiConnection } from '../client'

export type Dynasty = Awaited<ReturnType<typeof dynastiesApi.getAll>>[number]
/** 가문 상세 — 기본 + 통치기록(역사/현대) + 구성원 미리보기 */
export type DynastyDetail = Awaited<
  ReturnType<typeof dynastyDetailApi.getDetail>
>
export type DynastyHistoricalRule = DynastyDetail['historicalRules'][number]
export type DynastyModernRule = DynastyDetail['modernRules'][number]

/** 통치기록 수정 바디 — 기간(구조화)·종료 사유·비고. 통치 국가는 불변. */
export type DynastyRuleReasonBody = {
  startDateInfo?: DateInfoInput | null
  endDateInfo?: DateInfoInput | null
  endReason?: string | null
  notes?: string | null
}

/** 통치기록(역사국가) 신규 등록 바디. */
export type CreateDynastyHistoricalRuleBody = {
  historicalCountryId: string
  startDateInfo?: DateInfoInput | null
  endDateInfo?: DateInfoInput | null
  endReason?: string | null
  notes?: string | null
}

/** 통치기록(현대국가) 신규 등록 바디. */
export type CreateDynastyModernRuleBody = {
  countryId: string
  startDateInfo?: DateInfoInput | null
  endDateInfo?: DateInfoInput | null
  endReason?: string | null
  notes?: string | null
}

export type DynastyMutationBody = {
  name: string
  /** `null`이면 설명을 비움. 생략 시 기존값 유지 (편집 시) */
  description?: string | null
  /** 레거시 ISO 시작일. `null`이면 비움. 구조화 startDateInfo 우선. */
  startDate?: string | null
  /** 레거시 ISO 종료일. */
  endDate?: string | null
  /** 구조화 시작일 — BC·고대·연단위. `null`이면 시작일 축 클리어. 생략 시 유지(편집). */
  startDateInfo?: DateInfoInput | null
  /** 구조화 종료일 — `null`이면 종료일 축 클리어(현재/미상). */
  endDateInfo?: DateInfoInput | null
  startDatePrecision?: string | null
  endDatePrecision?: string | null
  /** 가문 성립 사유. `null`이면 비움. 생략 시 기존값 유지 (편집 시) */
  startReason?: string | null
  /** 가문 단절 사유. `null`이면 비움. 생략 시 기존값 유지 (편집 시) */
  endReason?: string | null
  thumbnailUrl?: string | null
  originPlace?: string | null
  founderId?: string | null
  founderText?: string | null
  crestImageUrl?: string | null
  motto?: string | null
}

export const dynastyApi = {
  getAll: async (): Promise<Dynasty[]> => {
    const result = await dynastiesApi.getAll(apiConnection)
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    return Array.isArray(result) ? result : []
  },

  getById: async (id: string): Promise<Dynasty> => {
    return await dynastiesApi.getById(apiConnection, id)
  },

  getDetail: async (id: string): Promise<DynastyDetail> => {
    return await dynastyDetailApi.getDetail(apiConnection, id)
  },

  /** 통치기록(역사국가) 종료 사유·비고 수정 → 갱신된 상세 반환 */
  updateHistoricalRuleReason: async (
    dynastyId: string,
    ruleId: string,
    body: DynastyRuleReasonBody,
  ): Promise<DynastyDetail> => {
    return await dynastyHistoricalRulesApi.updateHistoricalRuleReason(
      apiConnection,
      dynastyId,
      ruleId,
      body,
    )
  },

  /** 통치기록(현대국가) 종료 사유·비고 수정 → 갱신된 상세 반환 */
  updateModernRuleReason: async (
    dynastyId: string,
    ruleId: string,
    body: DynastyRuleReasonBody,
  ): Promise<DynastyDetail> => {
    return await dynastyModernRulesApi.updateModernRuleReason(
      apiConnection,
      dynastyId,
      ruleId,
      body,
    )
  },

  /** 통치기록(역사국가) 신규 등록 → 갱신된 상세 반환 */
  createHistoricalRule: async (
    dynastyId: string,
    body: CreateDynastyHistoricalRuleBody,
  ): Promise<DynastyDetail> => {
    return await dynastyHistoricalRulesApi.createHistoricalRule(
      apiConnection,
      dynastyId,
      body,
    )
  },

  /** 통치기록(현대국가) 신규 등록 → 갱신된 상세 반환 */
  createModernRule: async (
    dynastyId: string,
    body: CreateDynastyModernRuleBody,
  ): Promise<DynastyDetail> => {
    return await dynastyModernRulesApi.createModernRule(
      apiConnection,
      dynastyId,
      body,
    )
  },

  /** 통치기록(역사국가) 삭제 → 갱신된 상세 반환 */
  deleteHistoricalRule: async (
    dynastyId: string,
    ruleId: string,
  ): Promise<DynastyDetail> => {
    return await dynastyHistoricalRulesApi.deleteHistoricalRule(
      apiConnection,
      dynastyId,
      ruleId,
    )
  },

  /** 통치기록(현대국가) 삭제 → 갱신된 상세 반환 */
  deleteModernRule: async (
    dynastyId: string,
    ruleId: string,
  ): Promise<DynastyDetail> => {
    return await dynastyModernRulesApi.deleteModernRule(
      apiConnection,
      dynastyId,
      ruleId,
    )
  },

  // 로컬 타입은 null 허용(해제 의도) — 서버 CreateDynastyDto와의 차이는 단언으로 통과
  create: async (data: DynastyMutationBody) => {
    return await dynastiesApi.create(
      apiConnection,
      data as Parameters<typeof dynastiesApi.create>[1],
    )
  },

  update: async (id: string, data: Partial<DynastyMutationBody>) => {
    return await dynastiesApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await dynastiesApi._delete(apiConnection, id)
  },
}
