/**
 * 그래프 기반 교전 세력 관계 시스템
 * 
 * 핵심 개념:
 * - 국가 간 관계를 그래프(노드-엣지)로 표현
 * - 시간에 따른 관계 변화 추적
 * - AI가 자동으로 진영 분류
 */

// ============================================
// 1. 국가 관계 타입
// ============================================

export type RelationType =
  | 'allied'        // 동맹
  | 'enemy'         // 적대
  | 'neutral'       // 중립
  | 'puppet'        // 괴뢰국
  | 'occupied'      // 점령
  | 'cooperation'   // 협력 (동맹보다 약함)
  | 'non-aggression' // 불가침

export interface CountryRelation {
  id: string
  fromCountry: string     // 국가 ID
  toCountry: string       // 국가 ID
  relationType: RelationType
  
  // 시간 범위
  startDate: string
  endDate?: string
  
  // 관계 강도 (-100 ~ 100)
  // -100: 완전 적대, 0: 중립, 100: 완전 동맹
  strength: number
  
  // 근거 (조약, 협정 등)
  basedOnTreaties?: string[]  // treaty IDs
  
  // 군사 협력 여부
  militaryCooperation?: boolean
  
  // 설명
  description?: string
  
  // 메타데이터
  isSecret?: boolean  // 비밀 협정 여부
  isFormal?: boolean  // 공식 협정 여부
}

// ============================================
// 2. 조약/협정 타입
// ============================================

export type TreatyType =
  | 'alliance'          // 동맹 조약
  | 'non-aggression'    // 불가침 조약
  | 'trade'             // 무역 협정
  | 'territorial'       // 영토 분할
  | 'peace'             // 평화 조약
  | 'armistice'         // 휴전 협정
  | 'military-cooperation' // 군사 협력

export interface Treaty {
  id: string
  name: string           // "독소 불가침 조약", "북대서양 조약"
  signDate: string
  expiryDate?: string
  violationDate?: string // 조약 위반 날짜
  
  signatories: string[]  // 서명국 IDs
  type: TreatyType
  
  // 조약 내용
  terms?: string[]
  secretProtocols?: string[]  // 비밀 의정서
  
  description?: string
}

// ============================================
// 3. 동맹 타입
// ============================================

export interface Alliance {
  id: string
  name: string          // "연합국", "추축국", "NATO"
  
  formationDate: string
  dissolutionDate?: string
  
  type: 'military' | 'economic' | 'political' | 'defensive'
  
  // 회원국 이력
  members: Array<{
    countryId: string
    countryName: string
    joinDate: string
    leaveDate?: string
    status: 'founding' | 'joined' | 'left' | 'expelled' | 'observer'
    role?: 'leader' | 'member' | 'associate'
  }>
  
  // 동맹 조약
  foundingTreaty?: string  // treaty ID
  
  description?: string
}

// ============================================
// 4. 참전국 (노드) 타입
// ============================================

export interface BelligerentCountry {
  // 기본 정보
  countryId: string
  countryName: string
  isHistorical: boolean
  flagEmoji?: string
  /** 국기/썸네일 이미지 URL (시각화 표시용 — 빌더가 채우지 않으면 undefined) */
  thumbnailUrl?: string | null
  
  // 군사 정보
  commander?: string
  commanderPersonId?: string
  forces?: string          // 병력 규모
  deployedUnits?: string[] // 투입 부대 IDs
  weaponsUsed?: string[]   // 사용 무기
  
  // 역할/태그
  role?: string           // "주도국", "협력국", "방어국"
  tags?: string[]         // ["침공국", "추축국", "동부전선"]
  
  // 이 사건에서의 참여도
  participation: 'full' | 'limited' | 'indirect' | 'non-combatant'
  
  // 피해 규모
  casualties?: {
    military: {
      killed: string
      wounded: string
      missing: string
      captured: string
    }
    civilian?: {
      killed: string
      wounded: string
      displaced: string
    }
    total: string
  }
  
  // 자유 설명
  description?: string
}

// ============================================
// 5. 그래프 기반 교전 세력 (메인)
// ============================================

export interface EventBelligerentsGraph {
  // 참여 국가들 (노드)
  countries: BelligerentCountry[]
  
  // 국가 간 관계들 (엣지)
  relations: CountryRelation[]
  
  // 관련 조약들
  treaties?: Treaty[]
  
  // 관련 동맹들
  alliances?: Alliance[]
  
  // AI 자동 분류 결과 (선택 사항)
  autoSuggestedSides?: Array<{
    name: string
    memberCountryIds: string[]
    confidence: number  // 0~1
    reasoning: string   // "이 국가들은 모두 서로 allied 관계"
  }>
  
  // 수동 진영 분류 (사용자가 직접 지정)
  manualSides?: Array<{
    id: string
    name: string
    color?: string  // UI 표시용
    description?: string // 진영 설명 (선택)
    memberCountryIds: string[]
  }>
}

// ============================================
// 6. 관계 그래프 분석 결과
// ============================================

export interface RelationshipAnalysis {
  // 진영 클러스터 (자동 감지)
  clusters: Array<{
    id: string
    memberCountryIds: string[]
    cohesion: number  // 0~1 (내부 결속도)
    centralCountry?: string  // 중심 국가
  }>
  
  // 핵심 국가 (중요도 높은 국가)
  keyPlayers: Array<{
    countryId: string
    importance: number  // 0~1
    connections: number // 관계 수
    influence: number   // 영향력 점수
  }>
  
  // 외교 복잡도
  complexity: {
    totalRelations: number
    conflictingRelations: number  // 모순 관계 수
    allianceChanges: number       // 진영 변경 횟수
  }
}

// ============================================
// 7. 헬퍼 타입
// ============================================

export interface RelationshipGraphNode {
  countryId: string
  countryName: string
  x?: number  // 시각화용 좌표
  y?: number
}

export interface RelationshipGraphEdge {
  source: string  // country ID
  target: string  // country ID
  type: RelationType
  strength: number
  label?: string
}

// ============================================
// 8. 레거시 호환 타입
// ============================================

// 기존 BelligerentSide를 그래프 시스템으로 변환
export interface BelligerentSideCompat {
  id: string
  name: string
  countries: string[]  // country IDs
  
  // 그래프 데이터로 변환 가능
  toGraph?: () => {
    countries: BelligerentCountry[]
    relations: CountryRelation[]
  }
}

