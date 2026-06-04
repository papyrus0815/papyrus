import type { PersonNameFields } from '@/shared/lib/person-display-name'

export type TabType = 'overview' | 'genealogy' | 'politics' | 'events'

/**
 * 부모/조부모 계보의 말단(leaf) 인물 노드.
 * (기존 PersonDetailData.father/mother 에 4중첩 복붙되던 leaf 노드를 그대로 추출 — 구조 동일)
 */
type PersonNodeLite = PersonNameFields & { id?: string; gender?: string | null; profileImageUrl?: string | null; profileImages?: { url?: string | null }[] | null; dynasty?: { id?: string; name?: string | null } | null; birthDate?: string | Date | null; deathDate?: string | Date | null }

/** 부모 노드: leaf 필드 + (조부모) father/mother(leaf). 기존 인라인 구조와 동일. */
type PersonAncestorNode = PersonNodeLite & {
  father?: PersonNodeLite | null
  mother?: PersonNodeLite | null
}

/** 인물 상세 API 응답의 실질적 shape (persons-detail은 any 반환이므로 이 컴포넌트 내에서 타입 선언) */
export interface PersonDetailData {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  birthEra?: string | null
  /** ISO 날짜 문자열 (가계도 노드 등에서 사용) */
  birthDate?: string | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  deathEra?: string | null
  /** ISO 날짜 문자열 (가계도 노드 등에서 사용) */
  deathDate?: string | null
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  gender?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  preEnthronementTitle?: string | null
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  nicknames?: Array<{
    id?: string
    nickname?: string | null
    type?: string | null
    priority?: number | null
  }> | null
  createdAt?: string | null
  isAlive?: boolean | null
  influence?: number | null
  isDeathDateUnknown?: boolean | null
  dynastyId?: string | null
  religionId?: string | null
  religion?: { id?: string; name?: string | null } | null
  denomination?: { id: string; name: string } | null
  countryId?: string | null
  countryAffiliations?: Array<{
    id?: string
    affiliationType?: string | null
    priority?: number | null
    startDate?: string | null
    endDate?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
    country?: { id: string; name: string; isoCode?: string | null; flagEmoji?: string | null; thumbnailUrl?: string | null } | null
    historicalCountry?: { id: string; name: string } | null
  }> | null
  foundedDynasties?: Array<{
    id?: string
    name?: string | null
  }> | null
  educations?: Array<{
    id?: string
    organization?: { id?: string; name?: string | null } | null
    educationType?: string | null
    classNumber?: number | null
    degree?: string | null
    major?: string | null
    department?: string | null
    startDate?: string | null
    endDate?: string | null
    status?: string | null
    notes?: string | null
  }> | null
  awards?: Array<{
    id?: string
    awardName?: string | null
    awardingBody?: string | null
    awardDate?: string | null
    category?: string | null
    description?: string | null
  }> | null
  careers?: Array<{
    id?: string
    /** military / business / academic / religious / artist / athlete / media / legal / medical */
    kind: string
    /** 보직·직함·직급 등 카테고리별 라벨 */
    title?: string | null
    /** 군 계급 또는 직급 (Job 객체) */
    rank?: { id?: string; name?: string | null } | null
    organization?: { id?: string; name?: string | null } | null
    branch?: string | null
    department?: string | null
    termNumber?: number | null
    startDate?: string | null
    endDate?: string | null
    notes?: string | null
  }> | null
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
    defaultNameDisplayOrder?: string | null
  } | null
  dynasty?: { id: string; name: string } | null
  father?: PersonAncestorNode | null
  mother?: PersonAncestorNode | null
  spouse?: PersonNameFields | null
  siblings?: Array<PersonNameFields & {
    id?: string; gender?: string | null; profileImageUrl?: string | null;
    profileImages?: { url?: string | null }[] | null;
    dynasty?: { id?: string; name?: string | null } | null;
    birthDate?: string | Date | null; deathDate?: string | Date | null;
  }> | null
  children?: Array<PersonNameFields & {
    id?: string; gender?: string | null; profileImageUrl?: string | null;
    profileImages?: { url?: string | null }[] | null;
    dynasty?: { id?: string; name?: string | null } | null;
    birthDate?: string | Date | null; deathDate?: string | Date | null;
  }> | null
  spouseRelations?: Array<{
    id?: string
    marriageStartDate?: string | null
    marriageEndDate?: string | null
    note?: string | null
    spouse?: (PersonNameFields & {
      id?: string
      gender?: string | null
      profileImageUrl?: string | null
      profileImages?: { url?: string | null }[] | null
      dynasty?: { id?: string; name?: string | null } | null
      birthDate?: string | Date | null
      deathDate?: string | Date | null
    }) | null
  }> | null
  birthCity?: { id: string; name: string } | null
  deathCity?: { id: string; name: string } | null
  birthAdminDivision?: { id: string; name: string } | null
  deathAdminDivision?: { id: string; name: string } | null
  birthPlaceText?: string | null
  deathPlaceText?: string | null
  governmentPositions?: unknown[]
  governmentTenures?: unknown[]
  partyLeaderships?: Array<{
    id?: string
    roleTitle?: string | null
    startDate?: string | null
    endDate?: string | null
    party?: { id?: string; name?: string | null; shortName?: string | null } | null
  }> | null
  organizationRoles?: Array<{
    id?: string
    roleTitle?: string | null
    startDate?: string | null
    endDate?: string | null
    organization?: { id?: string; name?: string | null; shortName?: string | null } | null
  }> | null
  militaryCommands?: Array<{
    id?: string
    rank?: string | null
    role?: string | null
    startDate?: string | null
    endDate?: string | null
    unit?: { id?: string; name?: string | null; unitType?: string | null } | null
  }> | null
  books?: Array<{
    id?: string
    title?: string | null
    publishedYear?: number | null
    summary?: string | null
  }> | null
  foundedCompanies?: Array<{
    id?: string
    name?: string | null
    foundedAt?: string | null
    description?: string | null
  }> | null
  companies?: Array<{
    id?: string
    name?: string | null
    foundedAt?: string | null
    description?: string | null
  }> | null
  sovereignReigns?: Array<{
    id: string
    startDate?: string | null
    endDate?: string | null
    notes?: string | null
    regnalName?: string | null
    regnalNumber?: number | null
    positionDefinition?: { id?: string; title?: string | null } | null
    country?: { id?: string; name?: string | null } | null
    historicalCountry?: { id?: string; name?: string | null } | null
  }> | null
  humanRelationships?: unknown[]
  events?: unknown[]
  electionCandidacies?: unknown[]
}
