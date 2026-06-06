/**
 * 국가 교역(ExportImport) — 연도별 수출·수입 총액.
 */
export interface ExportImportResponse {
  id: string
  countryId: string
  year: number
  exportValue: number | null
  importValue: number | null
  createdAt: string
  updatedAt: string
}

/** countryId+year 기준 upsert 입력. */
export interface UpsertExportImportDto {
  year: number
  exportValue?: number | null
  importValue?: number | null
}
