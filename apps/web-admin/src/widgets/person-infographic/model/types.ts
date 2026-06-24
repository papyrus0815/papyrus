/**
 * 인포그래픽 뷰 전용 데이터 타입.
 * governmentTenures 등은 SDK DTO가 이미 정밀 타입이라 어댑터가 직접 읽는다(보조 타입 불필요).
 */

/** 시대 구간(ERAS 원소) 구조 — yearOfEra 결과를 캐시해 뷰/필터에서 재계산 없이 공유. */
export interface Era {
  key: string
  lbl: string
  from: number
  to: number
  color: string
}

/** 어댑터가 인포그래픽 뷰들에 넘기는 가공된 인물 데이터. */
export interface AdaptedPerson {
  id: string
  name: string
  /** 출생연도(BC 음수). 미상이면 null — 정렬·세기분류에서 제외, 배치는 bornForPlot 사용. */
  born: number | null
  /** 사망연도(BC 음수). 미상이면 null — 생존/미상 구분, 배치는 diedForPlot 사용. */
  died: number | null
  activityYear: number
  /** activityYear로 분류한 시대 — adapt에서 1회 산출(yearOfEra 반복 호출 제거). */
  era: Era
  age: number | null
  region: string
  country: string
  field: string
  faction: string
  influence: number
  profileImageUrl: string | null
  isMonarch: boolean
  isHeadOfState: boolean
  primaryTitle: string | null
  biography: string | null
  isAlive: boolean
  /** 검색 매칭용 사전 결합 텍스트 (표시명·원본명·성·국가·소속·직함 lowercase). 매 키 입력 재계산 방지. */
  searchText: string
}
