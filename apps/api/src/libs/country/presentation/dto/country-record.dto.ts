/**
 * 국가 기록(CountryRecord) — 자유 서술 + 기록 시점.
 */
export interface CountryRecordResponse {
  id: string
  countryId: string
  description: string
  recordedAt: string
  createdAt: string
  updatedAt: string
}

export interface CreateCountryRecordDto {
  description: string
  /** ISO 날짜 문자열. 없으면 현재 시각. */
  recordedAt?: string
}

export interface UpdateCountryRecordDto {
  description?: string
  recordedAt?: string
}
