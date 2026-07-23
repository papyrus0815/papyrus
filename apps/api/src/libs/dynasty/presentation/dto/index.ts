export interface CreateDynastyDto {
  name: string
  description?: string
  startDate?: string
  endDate?: string
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
  /** `null`이면 시작일을 비움. 생략 시 기존값 유지 */
  startDate?: string | null
  /** `null`이면 종료일을 비움. 생략 시 기존값 유지 */
  endDate?: string | null
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
  startDate: string | null
  endDate: string | null
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

export interface DynastyHistoricalRuleDto {
  id: string
  historicalCountryId: string
  historicalCountryName: string
  startEra: string | null
  startYear: number | null
  endEra: string | null
  endYear: number | null
  endReason: string | null
  notes: string | null
}

export interface DynastyModernRuleDto {
  id: string
  countryId: string
  countryName: string
  startEra: string | null
  startYear: number | null
  endEra: string | null
  endYear: number | null
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
