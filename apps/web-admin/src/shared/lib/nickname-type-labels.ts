/**
 * 별칭 유형 enum 라벨/옵션 — 등록 폼(select)과 인물 상세 표시에서 공유하는 단일 출처.
 * (백엔드 NicknameType/Prisma PersonNicknameType 미러 — 값 추가 시 함께 갱신.
 *  백엔드 쪽 드리프트는 create-person.dto.ts의 NICKNAME_TYPE_MIRROR_SYNCED가 컴파일 타임에 잡는다.)
 */

/** 별칭 유형 토큰 (PersonNicknameType 미러) */
export type NicknameTypeToken =
  | 'EPITHET'
  | 'PET_NAME'
  | 'HONORIFIC'
  | 'PEJORATIVE'
  | 'BIRTH_NAME'
  | 'CHILDHOOD_NAME'
  | 'COURTESY_NAME'
  | 'ART_NAME'
  | 'PEN_NAME'
  | 'POSTHUMOUS_NAME'
  | 'TEMPLE_NAME'
  | 'PSEUDONYM'
  | 'OTHER'

/** strict 키 맵 — 토큰 오타·누락은 컴파일 에러 */
const LABELS: Record<NicknameTypeToken, string> = {
  EPITHET: '별명',
  PET_NAME: '애칭',
  HONORIFIC: '존칭',
  PEJORATIVE: '멸칭·조롱',
  BIRTH_NAME: '출생명',
  CHILDHOOD_NAME: '아명',
  COURTESY_NAME: '자(字)',
  ART_NAME: '호·아호',
  PEN_NAME: '필명',
  POSTHUMOUS_NAME: '시호',
  TEMPLE_NAME: '묘호',
  PSEUDONYM: '가명',
  OTHER: '기타',
}

/** 표시용 느슨한 뷰 — 임의 문자열 인덱싱(`LABELS[v] ?? v` 폴백) 허용 */
export const NICKNAME_TYPE_LABELS: Record<string, string> = LABELS

export type NicknameTypeOption = { value: NicknameTypeToken; label: string }

export const NICKNAME_TYPE_OPTIONS: NicknameTypeOption[] = (
  Object.entries(LABELS) as [NicknameTypeToken, string][]
).map(([value, label]) => ({ value, label }))

/** enum 정식화 이전의 자유 문자열 유형 → 토큰 (미저장 draft 스냅샷·구 데이터 방어) */
const LEGACY_TYPE_ALIASES: Record<string, NicknameTypeToken> = {
  별명: 'EPITHET',
  이명: 'EPITHET',
  애칭: 'PET_NAME',
  존칭: 'HONORIFIC',
  경칭: 'HONORIFIC',
  조롱: 'PEJORATIVE',
  멸칭: 'PEJORATIVE',
  출생명: 'BIRTH_NAME',
  아명: 'CHILDHOOD_NAME',
  '자': 'COURTESY_NAME',
  '자(字)': 'COURTESY_NAME',
  '호': 'ART_NAME',
  아호: 'ART_NAME',
  '아호(雅號)': 'ART_NAME',
  필명: 'PEN_NAME',
  시호: 'POSTHUMOUS_NAME',
  묘호: 'TEMPLE_NAME',
  가명: 'PSEUDONYM',
  기타: 'OTHER',
}

/**
 * 임의 문자열을 별칭 유형 토큰으로 정규화.
 * 유효 토큰은 그대로, 레거시 한국어 표기는 매핑, 그 외 비어있지 않은 값은 'OTHER', 빈 값은 ''.
 */
export function normalizeNicknameType(
  raw: string | null | undefined,
): NicknameTypeToken | '' {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return ''
  if (trimmed in LABELS) return trimmed as NicknameTypeToken
  return LEGACY_TYPE_ALIASES[trimmed] ?? 'OTHER'
}
