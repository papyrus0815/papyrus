/**
 * 조약 목록 상태의 URL 정본 — `?q=&type=&sort=`.
 *
 * 예전엔 화면 안 useState라 행을 눌러 상세에 갔다 돌아오면 필터·정렬이 전부 풀렸다
 * (실측: '평화 조약' 7행 → 뒤로 → 23행). 사건 목록과 같이 URL이 정본이고, 상세로 갈 때는
 * 목록의 search 문자열을 router state로 들고 가서 '목록' 브레드크럼이 그대로 돌아온다.
 *
 * 상세 좌측 사이드바(widgets 층)도 같은 state로 처음 필터를 채우고, 행을 옮겨 다닐 때 자기
 * 필터를 다시 실어 보낸다 — 그래서 shared에 둔다(pages에 있으면 widgets가 import할 수 없다).
 */
import { TREATY_TYPE_LABELS, type TreatyType } from '@/shared/api/treaty'

export type TreatySortKey = 'date-desc' | 'date-asc' | 'name'

const SORT_KEYS: readonly TreatySortKey[] = ['date-desc', 'date-asc', 'name']

export interface TreatyListState {
  query: string
  type: TreatyType | ''
  sort: TreatySortKey
}

export function parseTreatyListState(params: URLSearchParams): TreatyListState {
  const rawType = params.get('type') ?? ''
  const rawSort = params.get('sort') ?? ''
  return {
    query: params.get('q') ?? '',
    /* 모르는 유형은 버린다 — 오타 URL이 '0건' 막다른 길이 되지 않게 */
    type: rawType in TREATY_TYPE_LABELS ? (rawType as TreatyType) : '',
    sort: (SORT_KEYS as readonly string[]).includes(rawSort)
      ? (rawSort as TreatySortKey)
      : 'date-desc',
  }
}

/** 기본값은 URL에 쓰지 않는다 — 아무것도 안 건 목록은 깨끗한 /treaties */
export function serializeTreatyListState(
  state: TreatyListState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (state.query) params.set('q', state.query)
  if (state.type) params.set('type', state.type)
  if (state.sort !== 'date-desc') params.set('sort', state.sort)
  return params
}

/** 목록 상태 → `?…` 검색 문자열(기본값뿐이면 빈 문자열) — router state에 싣는 형태 */
export function treatyListSearchOf(state: TreatyListState): string {
  const params = serializeTreatyListState(state).toString()
  return params ? `?${params}` : ''
}

/** 상세로 들고 가는 router state */
export interface TreatyListReturnState {
  treatyListSearch: string
}

export function readListSearch(state: unknown): string {
  if (
    state &&
    typeof state === 'object' &&
    'treatyListSearch' in state &&
    typeof (state as TreatyListReturnState).treatyListSearch === 'string'
  ) {
    const search = (state as TreatyListReturnState).treatyListSearch
    return search.startsWith('?') ? search : ''
  }
  return ''
}
