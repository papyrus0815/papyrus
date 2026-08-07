/**
 * 필터 축 라벨의 **폴백 단일 출처** (검토 URL-1/IA-16/DATA-17 · GAP-5)
 * FSD: features/event-filters/model
 *
 * ## 왜 필요했나
 *
 * 같은 '해석 실패' 상황에서 화면마다 다른 말을 했다 — 카테고리 트리거는 '알 수 없음',
 * 국가 트리거는 **'국가'**(= 필터 없음과 **같은 문자열**), 칩은 전부 '알 수 없음'.
 * 국가 축은 활성 스타일도 약해서 "필터가 안 걸린 것처럼 보이는데 결과는 0건"이 됐다.
 *
 * 게다가 그 세 상황('삭제된 id를 가리키는 링크' · '참조 데이터가 아직 안 옴' ·
 * '참조 조회가 영영 실패')이 전부 같은 문자열이라, 사용자는 원인을 구분할 수 없었다.
 * 참조 데이터는 react-query 비동기라 **필터가 걸린 공유 링크를 열 때마다** 로딩 구간을
 * 지난다 — 즉 정상 링크도 잠깐은 '고장난 화면'처럼 보였다.
 *
 * 트리거(위젯)와 칩(훅)이 이 파일 하나를 거치므로 두 표면이 갈릴 수 없다.
 */

/** 한 참조 축의 로드 상태 — 라벨 폴백 문구를 가른다 */
export type ReferenceLoadState = 'ready' | 'loading' | 'error'

/**
 * 필터 축별 참조 로드 상태.
 * 국가 축은 현대·역사 두 소스에서 이름을 찾으므로 둘을 합친 값이다(`combineReferenceState`).
 */
export interface FilterReferenceState {
  category: ReferenceLoadState
  country: ReferenceLoadState
  continent: ReferenceLoadState
}

/** 참조 데이터를 신경 쓰지 않는 소비처(테스트·다른 지면)를 위한 기본값 */
export const READY_REFERENCE_STATE: FilterReferenceState = {
  category: 'ready',
  country: 'ready',
  continent: 'ready',
}

/** 폴백 문구 — 트리거·칩·빈 상태가 모두 이 상수를 쓴다 */
export const REFERENCE_FALLBACK_LABEL = {
  loading: '불러오는 중',
  error: '이름 조회 실패',
  /** 로드는 끝났는데 그 id가 없다 = 삭제됐거나 잘못된 링크 */
  unresolved: '알 수 없음',
} as const

/**
 * 여러 소스를 함께 보는 축의 상태 합성.
 * 하나라도 로딩 중이면 '아직 모른다'(loading)가 정직하고, 로딩이 끝났는데 실패가
 * 섞여 있으면 '조회 실패'다. 둘 다 아니면 ready.
 */
export const combineReferenceState = (
  ...states: ReferenceLoadState[]
): ReferenceLoadState => {
  if (states.some((state) => state === 'loading')) return 'loading'
  if (states.some((state) => state === 'error')) return 'error'
  return 'ready'
}

/**
 * 선택된 id의 표시 이름을 만든다.
 * 이름을 찾았으면 그대로, 못 찾았으면 **원인별 폴백**을 돌려준다.
 */
export const resolveFilterValueLabel = (
  name: string | null | undefined,
  state: ReferenceLoadState,
): string => {
  if (name) return name
  if (state === 'loading') return REFERENCE_FALLBACK_LABEL.loading
  if (state === 'error') return REFERENCE_FALLBACK_LABEL.error
  return REFERENCE_FALLBACK_LABEL.unresolved
}
