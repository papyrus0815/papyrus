/**
 * 국가 교역(ExportImport) — 연도별 수출·수입 총액 + 그 해의 품목.
 */

/** 교역 방향 — 한 품목 행은 수출이거나 수입이다. */
export type TradeDirectionDto = 'EXPORT' | 'IMPORT'

/**
 * 교역 품목 한 줄.
 *
 * 총액만으로는 "얼마나"에만 답하고 "무엇을"에는 답하지 못한다. 이 행이 그 칸을 채운다.
 * `value`(금액)와 `sharePct`(비중) 중 하나만 아는 자료가 흔해 둘 다 선택 항목이다.
 */
export interface ExportImportItemResponse {
  id: string
  direction: TradeDirectionDto
  name: string
  hsCode: string | null
  value: number | null
  sharePct: number | null
  partnerCountryId: string | null
  /** 상대국 이름 — 프론트가 국가 목록을 다시 조회하지 않도록 함께 내려준다 */
  partnerCountryName: string | null
  sortOrder: number
}

export interface ExportImportResponse {
  id: string
  countryId: string
  year: number
  exportValue: number | null
  importValue: number | null
  /** 그 해의 품목 — 방향·순서대로 정렬돼 온다 */
  items: ExportImportItemResponse[]
  createdAt: string
  updatedAt: string
}

/** 품목 입력 — 자식 id는 클라이언트가 들고 다니지 않는다(배열 통째 교체). */
export interface UpsertExportImportItemDto {
  direction: TradeDirectionDto
  name: string
  hsCode?: string | null
  value?: number | null
  sharePct?: number | null
  partnerCountryId?: string | null
  sortOrder?: number | null
}

/** countryId+year 기준 upsert 입력. */
export interface UpsertExportImportDto {
  year: number
  exportValue?: number | null
  importValue?: number | null
  /**
   * 품목 배열. **주면 그 해 품목 전체를 이 배열로 교체**하고(delete-and-recreate),
   * 주지 않으면(undefined) 기존 품목을 건드리지 않는다 — 총액만 고치는 호출이
   * 품목을 조용히 날리면 안 되기 때문이다. 빈 배열은 '전부 지우기'다.
   */
  items?: UpsertExportImportItemDto[]
}
