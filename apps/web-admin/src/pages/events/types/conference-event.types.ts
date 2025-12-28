/**
 * 회담/외교 이벤트 타입 정의
 * 
 * 국제 회담, 조약 체결, 협상 등의 이벤트를 위한 타입
 */

// ============================================
// 국가별 조약 적용 사항
// ============================================

/**
 * 영토 변경 사항
 */
export interface TerritorialChanges {
  /** 획득한 영토 목록 */
  gained?: string[]
  /** 상실한 영토 목록 */
  lost?: string[]
  /** 영토 변경 설명 */
  description?: string
}

/**
 * 군사적 제한 사항
 */
export interface MilitaryLimitations {
  /** 해군 톤수 제한 (예: "35,000톤") */
  navalTonnage?: string
  /** 육군 병력 제한 (예: "100,000명") */
  armySize?: string
  /** 공군 제한 */
  airForce?: string
  /** 무기 제한 목록 */
  weaponRestrictions?: string[]
  /** 기타 군사 제한 사항 */
  otherRestrictions?: string[]
  /** 제한 설명 */
  description?: string
}

/**
 * 배상 조건
 */
export interface Reparations {
  /** 배상 금액 */
  amount: string
  /** 수취국 ID */
  recipientCountryId?: string
  /** 수취국 이름 */
  recipientCountryName?: string
  /** 지불 조건/기간 */
  terms?: string
  /** 배상 설명 */
  description?: string
}

/**
 * 권리 및 의무 사항
 */
export interface RightsAndObligations {
  /** 획득한 권리 목록 */
  gainedRights?: string[]
  /** 상실한 권리 목록 */
  lostRights?: string[]
  /** 새로 부여된 의무 목록 */
  obligations?: string[]
  /** 권리/의무 설명 */
  description?: string
}

/**
 * 국가별 조약 적용 사항
 */
export interface CountryTreatyTerm {
  /** 국가 ID */
  countryId: string
  /** 국가명 */
  countryName: string
  /** 역사적 국가 여부 */
  isHistorical: boolean
  
  /** 조약 서명 여부 */
  signed: boolean
  /** 서명일 */
  signedDate?: string
  
  /** 영토 변경 */
  territorialChanges?: TerritorialChanges
  /** 군사 제한 */
  militaryLimitations?: MilitaryLimitations
  /** 배상 조건 */
  reparations?: Reparations
  /** 권리 및 의무 */
  rightsAndObligations?: RightsAndObligations
  
  /** 특별 조항 (기타 사항) */
  specialTerms?: string
  /** 전체 요약 */
  summary?: string
}

// ============================================
// 조약/협정 정보
// ============================================

/**
 * 조약 타입
 */
export type TreatyType = 
  | 'peace'           // 평화 조약
  | 'armistice'       // 휴전 협정
  | 'alliance'        // 동맹 조약
  | 'non-aggression'  // 불가침 조약
  | 'trade'           // 무역 협정
  | 'arms-control'    // 군축 조약
  | 'territory'       // 영토 조약
  | 'other'           // 기타

/**
 * 조약/협정 정보
 */
export interface TreatyInfo {
  /** 조약명 */
  name: string
  /** 조약 타입 */
  type?: TreatyType
  /** 서명일 */
  signedDate?: string
  /** 발효일 */
  effectiveDate?: string
  /** 종료일/파기일 */
  expiryDate?: string
  /** 서명 장소 */
  location?: string
  /** 조약 내용 요약 */
  content?: string
  /** 조약 전문(全文) URL */
  fullTextUrl?: string
  /** 조약 결과/영향 */
  outcome?: string
}

// ============================================
// 회담 정보
// ============================================

/**
 * 회담 참가자
 */
export interface ConferenceParticipant {
  /** 국가 ID */
  countryId: string
  /** 국가명 */
  countryName: string
  /** 역사적 국가 여부 */
  isHistorical: boolean
  
  /** 대표자/대표단 */
  delegates?: string[]
  /** 대표자 인물 ID들 */
  delegatePersonIds?: string[]
  /** 참여 역할 (주최국, 중재국, 참관국 등) */
  role?: 'host' | 'mediator' | 'participant' | 'observer'
  /** 참여 설명 */
  description?: string
}

/**
 * 회담 의제
 */
export interface ConferenceAgenda {
  /** 의제 제목 */
  title: string
  /** 의제 설명 */
  description?: string
  /** 의제 순서 */
  order?: number
  /** 의제 결과 */
  outcome?: string
}

/**
 * 회담 상세 정보
 */
export interface ConferenceDetails {
  /** 회담 타입 */
  type?: 'summit' | 'conference' | 'negotiation' | 'forum' | 'convention'
  /** 회담 목적 */
  purpose?: string
  /** 회담 의제 목록 */
  agendas?: ConferenceAgenda[]
  /** 회담 결과 */
  outcome?: string
  /** 참고사항 */
  notes?: string
}

// ============================================
// 회담 이벤트 전체 구조
// ============================================

/**
 * 회담/외교 이벤트 데이터
 */
export interface ConferenceEvent {
  /** 회담 상세 정보 */
  conferenceDetails?: ConferenceDetails
  /** 참가국 목록 */
  participants?: ConferenceParticipant[]
  /** 체결된 조약/협정 목록 */
  treaties?: TreatyInfo[]
  /** 국가별 조약 적용 사항 */
  countryTerms?: CountryTreatyTerm[]
  /** 회담 경비/비용 */
  cost?: string
}

