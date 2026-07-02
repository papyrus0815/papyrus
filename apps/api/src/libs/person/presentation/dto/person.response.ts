import { Era, DeathType } from './create-person.dto'

/**
 * 인물 응답 DTO
 */
export interface PersonResponseDto {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  originalName: string | null
  surnameMeaning: string | null
  nameMeaning: string | null
  middleNameMeaning: string | null
  birthEra: Era | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
  deathEra: Era | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
  gender: string | null
  biography: string | null
  profileImageUrl: string | null
  // 왕/군주 관련 필드
  regnalName: string | null
  templeName: string | null
  posthumousName: string | null
  // 관계
  dynastyId: string | null
  /** 가문 (목록/재임 응답에서 노출, id·name만) */
  dynasty?: { id: string; name: string } | null
  religionId: string | null
  religion?: { id: string; name: string } | null
  denominationId: string | null
  denomination?: { id: string; name: string } | null
  fatherId: string | null
  motherId: string | null
  /** 사생아·서출 여부 — 가계도 카드 별표(*) 마커 */
  illegitimate: boolean
  countryId: string | null
  /** 소속 국가 (목록 표시용, id·name·flagEmoji·이름 표시 기본) */
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    isoCode?: string | null
    defaultNameDisplayOrder?: string | null
  } | null
  birthCityId: string | null
  deathCityId: string | null
  /** 출생지 행정구역 ID */
  birthAdminDivisionId?: string | null
  /** 사망지 행정구역 ID */
  deathAdminDivisionId?: string | null
  /** 출생지 직접 입력 텍스트 */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 */
  deathPlaceText?: string | null
  /** 출생지 도시 정보 */
  birthCity?: { id: string; name: string } | null
  /** 사망지 도시 정보 */
  deathCity?: { id: string; name: string } | null
  /** 출생지 행정구역 정보 */
  birthAdminDivision?: { id: string; name: string } | null
  /** 사망지 행정구역 정보 */
  deathAdminDivision?: { id: string; name: string } | null
  // 이벤트 목록에 생몰년 표시 여부
  showLifespanOnEventList?: boolean
  /** 사망일 미상 여부 */
  isDeathDateUnknown?: boolean
  /** 사망 유형 */
  deathType?: DeathType | null
  /** 사망 원인 상세 */
  deathCause?: string | null
  /** 사망 관련 메모 */
  deathNote?: string | null
  /** 생존 여부 */
  isAlive?: boolean
  /** 역사적 영향력 (0–100) */
  influence?: number | null
  // 정부 직위 재임 기록
  governmentTenures?: any[]
  /** 군주·재위 전용 기록 (SovereignReign — 행정부 재임과 별도 테이블) */
  sovereignReigns?: any[]
  /** 인물 연보 (PersonLifeEvent — 자유 서술형 시간축) */
  lifeEvents?: any[]
  createdAt: string
  updatedAt: string
  /** 등록 계정 ID (소유권 검사용, 선택 노출) */
  accountId?: string | null
}

/**
 * 가계도(family-tree) 응답 계약.
 *
 * 이 인터페이스는 `PersonRepository.findFamilyTree`가 실제로 만들어내는 노드/엣지 shape의
 * 단일 진실이다. 서비스·컨트롤러·리포지토리 반환 타입을 모두 이 DTO로 고정해, 필드를
 * 추가(예: 엣지 parentRole, 노드 dynastyOrdinal)할 때 백엔드 전 계층에서 컴파일타임에
 * 강제되도록 한다.
 *
 * 주의: web-admin은 아직 nestia SDK가 아니라 raw fetch 래퍼
 * (`apps/web-admin/src/shared/api/persons-family-tree.ts`)로 이 응답을 받는다.
 * 그 인터페이스(FamilyTreePerson/FamilyTreeEdge/FamilyTreeData)는 이 DTO와 대칭으로
 * 유지해야 한다 — 여기 필드를 바꾸면 클라이언트 래퍼도 함께 갱신할 것.
 */
export interface FamilyTreeNodeFlagDto {
  countryId: string
  countryName: string
  flagEmoji: string | null
  isoCode: string | null
  thumbnailUrl: string | null
}

export interface FamilyTreeNodeSovereignCountryDto {
  id: string | null
  name: string | null
  regnalNumber: number | null
  flagEmoji: string | null
  isoCode: string | null
  thumbnailUrl: string | null
}

export interface FamilyTreeNodeCountryDto {
  id: string
  name: string
  flagEmoji: string | null
  isoCode: string | null
  thumbnailUrl: string | null
}

export interface FamilyTreeNodeDto {
  id: string
  /**
   * 현재 계정이 이 노드의 상세를 열 수 있는지 (= findByIdWithRelations 계정 스코프 술어).
   * 트리는 공개로 전 노드를 그리되, false면 프론트에서 클릭 비활성(열면 404 방지).
   * 비인증 요청(accountId 없음)은 상세도 무스코프라 전 노드 true.
   */
  isOwned: boolean
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  gender: string | null
  regnalName: string | null
  profileImageUrl: string | null
  birthYear: number | null
  deathYear: number | null
  dynasty: { id: string; name: string } | null
  /** 사생아·서출 — UI 별표(*) 마커 */
  illegitimate: boolean
  /** 어떤 결혼에서 태어난 자녀인지 — 다중 배우자 분기용 PersonSpouse FK */
  parentMarriageId: string | null
  originalName: string | null
  posthumousName: string | null
  templeName: string | null
  preEnthronementTitle: string | null
  birthPlace: string | null
  deathPlace: string | null
  /** 가장 이른 재임 — 군주 카드 즉위국·재위 번호 + 국기 */
  sovereignCountry: FamilyTreeNodeSovereignCountryDto | null
  /** 일반 인물 카드 국기 — Person.countryId (legacy 주 국적) */
  country: FamilyTreeNodeCountryDto | null
  /** UI 편의 — 우선순위(sovereignCountry > country) 적용 결과 */
  flag: FamilyTreeNodeFlagDto | null
}

export interface FamilyTreeEdgeDto {
  source: string
  target: string
  type: 'parent-child' | 'spouse'
  /** spouse 엣지에만: 결혼 시작/종료 연도 + 메모 */
  marriageStartYear?: number | null
  marriageEndYear?: number | null
  note?: string | null
  /** spouse 엣지에만: PersonSpouse 미등록 — 자녀의 다른 친부모로 추정된 배우자 */
  inferred?: boolean
}

export interface FamilyTreeTruncationDto {
  scope: string
  took: number
  limit: number
}

export interface FamilyTreeResponseDto {
  egoId: string
  nodes: FamilyTreeNodeDto[]
  edges: FamilyTreeEdgeDto[]
  /** BFS take 한계로 절단된 항목 — UI "외 N명" 표시용 */
  truncations?: FamilyTreeTruncationDto[]
}
