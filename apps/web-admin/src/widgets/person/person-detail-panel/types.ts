import type { PersonNameFields } from '@/shared/lib/person-display-name'
import type { BiographySectionData } from './person-biography-sections'
import type { TenureAchievementItem } from './tenure-achievements'

export type TabType = 'overview' | 'genealogy' | 'politics' | 'events'

/**
 * 재임(GovernmentTenure)·재위(SovereignReign) 공통 카드 레코드.
 * 개요 "재임·재위" 섹션이 두 종류를 동일 형태로 렌더하므로 공유 shape으로 정의.
 */
export interface TenureLikeRecord {
  id: string
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
  /** 재임 통산 대수 / 재위는 termNumber */
  termNumber?: number | null
  subTermNumber?: number | null
  /** 재위 국가별 즉위 서수 */
  regnalNumber?: number | null
  regnalName?: string | null
  appointmentMethod?: string | null
  endReason?: string | null
  endReasonDetail?: string | null
  title?: string | null
  /** 직위 유형(GovernmentPositionType — HEAD_OF_STATE 등). 재임에만 존재, 재위는 없음. */
  positionType?: string | null
  positionDefinition?: { id?: string; title?: string | null } | null
  country?: { id?: string; name?: string | null } | null
  historicalCountry?: { id?: string; name?: string | null } | null
  achievements?: TenureAchievementItem[] | null
  /** 각료로 소속된 행정부(같은 행정부 동료 표시용). 재임에만 존재. */
  cabinetId?: string | null
  cabinet?: { id: string; name?: string | null } | null
  /** 이 재임이 수반(대통령·총리)으로 수장인 행정부. 재임에만 존재. */
  headOfCabinet?: { id: string; name?: string | null } | null
}

/**
 * 재임·재위 통합 카드의 표시용 항목.
 * 정렬·서수·연임 판정을 메모에서 미리 계산해 렌더 컴포넌트는 표시에만 집중한다.
 */
export interface CombinedTenureItem {
  kind: 'tenure' | 'reign'
  data: TenureLikeRecord
  /** 표시용 대(ordinal) — 재위는 regnalNumber 우선, 재임은 termNumber 우선 */
  ordinalNum: number | null
  /** 연임 여부 — subTermNumber≥2(본인 회차) 또는 같은 대 2건 이상 */
  isReappointment: boolean
}

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
  /** 출생일 정밀도 'year'|'month'|'day'. precision<day면 서버가 month/day를 null로 내려준다. */
  birthDatePrecision?: string | null
  birthEra?: string | null
  /** ISO 날짜 문자열 (가계도 노드 등에서 사용) */
  birthDate?: string | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  deathDatePrecision?: string | null
  deathEra?: string | null
  /** ISO 날짜 문자열 (가계도 노드 등에서 사용) */
  deathDate?: string | null
  birthNote?: string | null
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  gender?: string | null
  biography?: string | null
  biographySections?: BiographySectionData[] | null
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
    /** 이 별칭이 붙은 이유·유래 */
    reason?: string | null
  }> | null
  createdAt?: string | null
  isAlive?: boolean | null
  /** 활동시기(floruit) — 생몰 전면 미상 인물의 활동 연대(생몰 폴백). 크기값(양수)+floruitEra. */
  floruitStartYear?: number | null
  floruitEndYear?: number | null
  floruitEra?: string | null
  influence?: number | null
  isBirthDateUnknown?: boolean | null
  isDeathDateUnknown?: boolean | null
  /** 출생/사망일 추정(circa) — 표시에 '경' 접미 */
  isBirthDateApproximate?: boolean | null
  isDeathDateApproximate?: boolean | null
  /** 사생아·서출 — 가계도 별표(*)와 동일 시맨틱 */
  illegitimate?: boolean | null
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
  /** 부모 FK 스칼라 — 형제 친/이복/이부 판별(classifySiblingKinship)의 anchor 입력 */
  fatherId?: string | null
  motherId?: string | null
  father?: PersonAncestorNode | null
  mother?: PersonAncestorNode | null
  spouse?: PersonNameFields | null
  siblings?: Array<PersonNameFields & {
    id?: string; gender?: string | null; profileImageUrl?: string | null;
    profileImages?: { url?: string | null }[] | null;
    dynasty?: { id?: string; name?: string | null } | null;
    birthDate?: string | Date | null; deathDate?: string | Date | null;
    /** 친/이복/이부 판별용 부모 FK + 사생아 마커 (REST 투영과 정합) */
    fatherId?: string | null; motherId?: string | null;
    illegitimate?: boolean | null;
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
  /**
   * 재임 기록. detail 엔드포인트는 `governmentPositions`, 그 외(목록·DTO)는
   * `governmentTenures` 로 같은 데이터를 다른 이름으로 내려준다. 읽을 땐
   * `pickGovernmentTenures()` 로 통합 — 직접 분기 금지.
   */
  governmentPositions?: TenureLikeRecord[] | null
  governmentTenures?: TenureLikeRecord[] | null
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
  /** 군주·재위 기록 (SovereignReign). 재임과 동일 카드 shape → TenureLikeRecord 재사용 */
  sovereignReigns?: TenureLikeRecord[] | null
  humanRelationships?: unknown[]
  events?: unknown[]
  electionCandidacies?: unknown[]
}
