/**
 * 구조화 날짜 입력 채널 — BC·고대·연단위 지원 (person DateInfoDto 미러).
 * 이 도메인 DTO는 interface(ValidationPipe 없음)라 class DateInfoDto를 재사용하지 못하므로 로컬 재선언.
 * year=크기값(양수)·era=BC/AD. 서버가 mapStructuredDateInput으로 6컬럼(DateTime+precision+era/year/month/day)에 매핑.
 */
export interface DateInfo {
  era: 'BC' | 'AD'
  year: number
  month?: number
  day?: number
}

export interface CreateDynastyDto {
  name: string
  description?: string
  /** 레거시 ISO 시작일(AD only). 구조화 startDateInfo가 있으면 그쪽이 우선. */
  startDate?: string
  /** 레거시 ISO 종료일(AD only). 구조화 endDateInfo가 있으면 그쪽이 우선. */
  endDate?: string
  /** 구조화 시작일 — BC·고대·연단위 (era+크기값 연/월/일). */
  startDateInfo?: DateInfo | null
  /** 구조화 종료일 — BC·고대·연단위. */
  endDateInfo?: DateInfo | null
  /** 시작일 정밀도('year'|'month'|'day'). 구조화 입력 시 서버가 재파생. */
  startDatePrecision?: string | null
  /** 종료일 정밀도. */
  endDatePrecision?: string | null
  /** 가문 시작(성립) 사유 (시조 즉위·분가 독립·최초 문헌 등장 등) */
  startReason?: string | null
  /** 가문 종료(단절) 사유 (멸문·권력 상실·개명·타가문 병합 등) */
  endReason?: string | null
  /** `POST /upload/image?category=dynasties` 응답의 `url`(`/uploads/...`) */
  thumbnailUrl?: string | null
  /** 본관/발상지 */
  originPlace?: string | null
  /** 시조 인물 ID (Person FK) */
  founderId?: string | null
  /** 시조 이름 텍스트 (Person 미등록 케이스) */
  founderText?: string | null
  /** 가문 상징/문장 이미지 URL */
  crestImageUrl?: string | null
  /** 가훈 */
  motto?: string | null
}

export interface UpdateDynastyDto {
  name?: string
  /** `null`이면 설명을 비움. 생략 시 기존값 유지 */
  description?: string | null
  /** `null`이면 시작일을 비움. 생략 시 기존값 유지 (레거시 ISO, 구조화 startDateInfo 우선) */
  startDate?: string | null
  /** `null`이면 종료일을 비움. 생략 시 기존값 유지 (레거시 ISO) */
  endDate?: string | null
  /** 구조화 시작일. `null`이면 시작일 축을 비움(6컬럼 통째). 생략 시 기존 유지. */
  startDateInfo?: DateInfo | null
  /** 구조화 종료일. `null`이면 종료일 축을 비움. 생략 시 기존 유지. */
  endDateInfo?: DateInfo | null
  startDatePrecision?: string | null
  endDatePrecision?: string | null
  /** `null`이면 성립 사유를 비움. 생략 시 기존값 유지 */
  startReason?: string | null
  /** `null`이면 단절 사유를 비움. 생략 시 기존값 유지 */
  endReason?: string | null
  /** 새 파일 업로드 후의 `url`. `null`/빈 문자열이면 썸네일만 삭제. 생략 시 기존 유지 */
  thumbnailUrl?: string | null
  originPlace?: string | null
  founderId?: string | null
  founderText?: string | null
  crestImageUrl?: string | null
  motto?: string | null
}

export interface DynastyFounderBrief {
  id: string
  name: string
  surname: string | null
  birthDate: string | null
  deathDate: string | null
}

export interface DynastyResponseDto {
  id: string
  name: string
  description: string | null
  /** 레거시 ISO 시작일 — AD1000~9999 완전일자만 값, 그 밖은 null(구조화 필드가 진실). */
  startDate: string | null
  endDate: string | null
  /** 구조화 시작일 축 — BC·고대·연단위. startDate가 null이어도 이 필드가 진실. */
  startDatePrecision: string | null
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endDatePrecision: string | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  startReason: string | null
  endReason: string | null
  thumbnailUrl: string | null
  originPlace: string | null
  founderId: string | null
  founder: DynastyFounderBrief | null
  founderText: string | null
  crestImageUrl: string | null
  motto: string | null
  /** 이 가문에 속한 인물 수 */
  memberCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 통치기록(DynastyRule/ModernRule) 수정 바디 — 기간(구조화)·종료 사유·비고.
 * 통치 국가(FK)는 수정 대상 아님(바꾸려면 삭제 후 재등록). `null`=비움, 생략=기존값 유지.
 * 날짜 축은 startDateInfo/endDateInfo가 오면(!==undefined) era/year/month/day를 통째 세팅.
 * endReason은 VarChar(200)이라 서버 clamp. 이름은 하위호환(Batch 0 endReason 편집도 이 바디).
 */
export interface UpdateDynastyRuleReasonDto {
  /** 구조화 통치 시작일 — BC·고대·연단위. `null`=시작일 비움. 생략=유지. */
  startDateInfo?: DateInfo | null
  /** 구조화 통치 종료일 — `null`=종료일 비움(진행중/미상). */
  endDateInfo?: DateInfo | null
  /** 통치 시작 사유 (정복·상속·선출·건국 — 가문 성립과 층위 다름). */
  startReason?: string | null
  /** 통치 종료 사유 ({국가명} 통치 종료 — 가문 자체 단절과 층위 다름). */
  endReason?: string | null
  /** 비고/특이사항. */
  notes?: string | null
}

/** 통치기록(역사국가) 신규 등록 바디. */
export interface CreateDynastyHistoricalRuleDto {
  /** 통치 대상 역사국가 ID (FK). */
  historicalCountryId: string
  startDateInfo?: DateInfo | null
  endDateInfo?: DateInfo | null
  startReason?: string | null
  endReason?: string | null
  notes?: string | null
}

/** 통치기록(현대국가) 신규 등록 바디. */
export interface CreateDynastyModernRuleDto {
  /** 통치 대상 현대국가 ID (FK). */
  countryId: string
  startDateInfo?: DateInfo | null
  endDateInfo?: DateInfo | null
  startReason?: string | null
  endReason?: string | null
  notes?: string | null
}

export interface DynastyHistoricalRuleDto {
  id: string
  historicalCountryId: string
  historicalCountryName: string
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  startReason: string | null
  endReason: string | null
  notes: string | null
}

export interface DynastyModernRuleDto {
  id: string
  countryId: string
  countryName: string
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  startReason: string | null
  endReason: string | null
  notes: string | null
}

export interface DynastyMemberBrief {
  id: string
  name: string
  surname: string | null
  birthDate: string | null
  deathDate: string | null
  profileImageUrl: string | null
}

export interface DynastyDetailResponseDto extends DynastyResponseDto {
  historicalRules: DynastyHistoricalRuleDto[]
  modernRules: DynastyModernRuleDto[]
  memberCount: number
  members: DynastyMemberBrief[]
}
