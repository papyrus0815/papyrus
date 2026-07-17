/**
 * 재임(GovernmentPositionTenure) / 재위(SovereignReign)의 표준(canonical) 프론트 모델.
 *
 * 세 화면(국가 상세·수장 비교 타임라인·인물 상세)이 서로 다른 엔드포인트에서 *조금씩 다른 모양*의
 * tenure를 받는다. 어떤 응답도 모든 필드를 다 주지 않으므로(예: 인물 상세 tenure엔 person이 없고,
 * 국가 목록엔 achievements가 없음) **id 외 전부 optional/null 허용**으로 두고, 소비 컴포넌트는
 * 필드 부재를 자연스럽게 견디게(graceful degrade) 만든다. 각 응답 모양 → 이 타입으로의 변환은
 * `normalize.ts`가 담당한다.
 */

export type TenureKind = 'TENURE' | 'SOVEREIGN_REIGN'

/** 직책 분류 — 색상·범례·대통령/총리 구분 필터의 단일 기준 */
export type PositionCategory = 'MONARCH' | 'PRESIDENT' | 'PM' | 'POPE' | 'OTHER'

export interface TenureAchievement {
  id: string
  title: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  orderNum: number | null
  showOnEventsPage: boolean | null
  eventId: string | null
  event: { id: string; title: string | null; deletedAt: string | null } | null
}

export interface TenurePersonRef {
  id: string | null
  name: string | null
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  profileImageUrl: string | null
}

export interface TenureCountryRef {
  id: string | null
  name: string | null
}

export interface Tenure {
  id: string
  kind: TenureKind
  /** 인물 식별자 — 인물 상세 응답에선 부모가 인물이라 person이 비어 personId만 채워질 수 있다 */
  personId: string | null
  /** 인물 요약 — 인물 상세 응답에선 null(부모 컨텍스트가 인물) */
  person: TenurePersonRef | null
  positionType: string | null
  /** 색·범례·대통령/총리 구분용 분류 (positionType·title·임명방식·kind로 산출) */
  positionCategory: PositionCategory
  /** 표시용 직책명 (대통령·국왕 등) */
  positionTitle: string | null
  /** 왕명·교황명·묘호 등 — 전용 필드 또는 레거시 `왕명:` notes에서 추출 */
  regnalName: string | null
  /** 대수/재위번호 표시값 (regnalNumber ?? termNumber) */
  ordinal: number | null
  termNumber: number | null
  subTermNumber: number | null
  regnalNumber: number | null
  /** 왕조 내 서수 (예: 5 → "부르봉 왕조 5대") — 재위(SOVEREIGN_REIGN) 전용, 왕조명은 인물의 소속 왕조에서 */
  dynastyOrdinal: number | null
  country: TenureCountryRef | null
  historicalCountry: TenureCountryRef | null
  startDate: string | null
  endDate: string | null
  appointmentMethod: string | null
  endReason: string | null
  endReasonDetail: string | null
  notes: string | null
  cabinetId: string | null
  /** 업적·한일 — 국가/타임라인 목록 응답엔 없어 빈 배열일 수 있음 */
  achievements: TenureAchievement[]
}
