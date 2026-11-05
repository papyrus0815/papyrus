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

/** 혼인 종료/해소 사유 토큰 (MarriageEndReason 미러) */
export type MarriageEndReasonToken =
  | 'DEATH'
  | 'DIVORCE'
  | 'DEPOSED'
  | 'ANNULMENT'
  | 'SEPARATION'
  | 'OTHER'

const END_REASON_LABELS: Record<MarriageEndReasonToken, string> = {
  DEATH: '사별',
  DIVORCE: '이혼',
  DEPOSED: '폐위·출처',
  ANNULMENT: '혼인무효',
  SEPARATION: '별거',
  OTHER: '기타',
}

export const MARRIAGE_END_REASON_LABELS: Record<string, string> = END_REASON_LABELS

export type MarriageEndReasonOption = { value: MarriageEndReasonToken; label: string }

export const MARRIAGE_END_REASON_OPTIONS: MarriageEndReasonOption[] = (
  Object.entries(END_REASON_LABELS) as [MarriageEndReasonToken, string][]
).map(([value, label]) => ({ value, label }))

/**
 * 관점(viewer) 인식 혼인 서열 라벨 계산.
 * 비대칭 서열(PRIMARY·SECONDARY·CONCUBINE)이 현재 조회 인물(viewerPersonId)에게 귀속된 경우
 * (예: 후궁 프로필에서 남편/왕을 볼 때) 남편에게 '후궁·측실'이 붙는 역전을 방지하고 '부군 (남편)'으로 표시한다.
 */
export function resolvePerspectiveMarriageRankLabel(params: {
  marriageRank?: string | null
  rank?: string | null
  rankHolderId?: string | null
  viewerPersonId?: string | null
  egoId?: string | null
  viewerGender?: string | null
  spouseId?: string | null
  partnerId?: string | null
  spouseGender?: string | null
  partnerGender?: string | null
}): string | null {
  const marriageRank = params.marriageRank ?? params.rank ?? null
  const rankHolderId = params.rankHolderId ?? null
  const viewerPersonId = params.viewerPersonId ?? params.egoId ?? null
  const viewerGender = (params.viewerGender ?? '').toUpperCase()
  const spouseId = params.spouseId ?? params.partnerId ?? null
  const spGender = (params.spouseGender ?? params.partnerGender ?? '').toUpperCase()

  if (!marriageRank) return null
  const isAsymmetric =
    marriageRank === 'PRIMARY' || marriageRank === 'SECONDARY' || marriageRank === 'CONCUBINE'
  if (!isAsymmetric) {
    return MARRIAGE_RANK_LABELS[marriageRank] ?? marriageRank
  }
  // 1) rankHolderId가 현재 기준 인물(viewer)이면 상대 배우자는 서열 보유자가 아니라 부군/정배이다.
  if (
    rankHolderId &&
    viewerPersonId &&
    rankHolderId === viewerPersonId &&
    (!spouseId || rankHolderId !== spouseId)
  ) {
    return spGender === 'FEMALE' ? '정배 (부인)' : '부군 (남편)'
  }
  // 2) 기준 인물이 여성이고 상대 배우자가 남성인데 비대칭 서열(정실·계비·후궁)이 남성 쪽으로 잘못 귀속됐거나 미지정인 경우 부군으로 방어.
  if (spGender === 'MALE' && viewerGender === 'FEMALE') {
    return '부군 (남편)'
  }
  // 3) rankHolderId가 미지정인 레거시 행이라도 상대 배우자가 남성이고 비대칭 서열이면 부군으로 방어.
  if (!rankHolderId && spGender === 'MALE') {
    return '부군 (남편)'
  }
  return MARRIAGE_RANK_LABELS[marriageRank] ?? marriageRank
}
