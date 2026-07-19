/**
 * 혼인 서열/형태 enum 라벨/옵션 — 등록 폼(select)과 상세 표시에서 공유하는 단일 출처.
 * (백엔드 MarriageRank/Prisma MarriageRank 미러 — 값 추가 시 함께 갱신.
 *  백엔드 쪽 드리프트는 create-person.dto.ts의 MARRIAGE_RANK_MIRROR_SYNCED가 컴파일 타임에 잡는다.)
 */

/** 혼인 서열 토큰 (MarriageRank 미러) — 순서 = 표시·정렬 순서(정실 우선) */
export type MarriageRankToken =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'CONCUBINE'
  | 'MORGANATIC'
  | 'COMMON_LAW'
  | 'OTHER'

/** strict 키 맵 — 토큰 오타·누락은 컴파일 에러 */
const LABELS: Record<MarriageRankToken, string> = {
  PRIMARY: '정실',
  SECONDARY: '계비·후처',
  CONCUBINE: '후궁·측실',
  MORGANATIC: '귀천상혼',
  COMMON_LAW: '사실혼',
  OTHER: '기타',
}

/** 표시용 느슨한 뷰 — 임의 문자열 인덱싱(`LABELS[v] ?? v` 폴백) 허용 */
export const MARRIAGE_RANK_LABELS: Record<string, string> = LABELS

export type MarriageRankOption = { value: MarriageRankToken; label: string }

export const MARRIAGE_RANK_OPTIONS: MarriageRankOption[] = (
  Object.entries(LABELS) as [MarriageRankToken, string][]
).map(([value, label]) => ({ value, label }))

/** 정렬 순서 인덱스 — 미분류(null·'')는 마지막 */
export function marriageRankOrder(rank?: string | null): number {
  if (!rank) return 99
  const index = MARRIAGE_RANK_OPTIONS.findIndex((option) => option.value === rank)
  return index === -1 ? 99 : index
}
