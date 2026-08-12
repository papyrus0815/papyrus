import { getEventCommentCount } from '@/shared/api/events'

/**
 * 연관(네트워크) 섹션 공용 헬퍼 — 컨테이너(detail-network)와 블록(parent/children/
 * keywords)이 함께 쓰는 순수 함수·상수. React 의존 없음(import 순환 차단 지점).
 */

/**
 * 계층 연결 사유 최대 글자 수 — 서버 EVENT_LINK_REASON_MAX(update-event.dto.ts)·
 * Prisma VarChar(500)와 동일 값. 크로스 패키지라 손 동기화.
 */
export const REASON_MAX = 500

/**
 * 칩/카드 제거 시 포커스 이양 — 제거 버튼에 있던 포커스가 body로 낙하하지 않게,
 * 렌더 순서상 다음 형제의 제거 버튼(없거나 표시 캡 밖이면 그룹 '추가' 버튼)으로 옮긴다.
 * 다음 형제 DOM은 제거 re-render 후에도 살아남으므로 제거 직전 즉시 focus해도 유지된다.
 */
export function focusNextRemovalTarget(
  removeButtonRefs: Map<string, HTMLButtonElement>,
  orderedIds: readonly string[],
  removedId: string,
  fallback: HTMLButtonElement | null,
) {
  const removedIndex = orderedIds.indexOf(removedId)
  const nextId = removedIndex >= 0 ? orderedIds[removedIndex + 1] : undefined
  const nextTarget = nextId ? removeButtonRefs.get(nextId) : undefined
  ;(nextTarget ?? fallback)?.focus()
}

/**
 * 서버 에러 → 사용자 문구 — use-event-mutation.ts friendlyErrorMessage의 지역 미러
 * (비export 함수라 크로스 사건 채널용으로 복제). nestia HttpError.message는 응답
 * 본문(JSON) 원문이라 순환 409 등이 `{"message":…}` 블롭으로 뜬다 — message만 추출.
 */
export function crossPatchErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '알 수 없는 오류'
  const raw =
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : ''
  const pickMessage = (text: string): string | null => {
    try {
      const parsed = JSON.parse(text) as { message?: unknown }
      if (typeof parsed.message === 'string') return parsed.message
      if (Array.isArray(parsed.message)) return parsed.message.join(', ')
    } catch {
      /* JSON 아님 */
    }
    return null
  }
  const direct = pickMessage(raw)
  if (direct) return direct
  const braceIndex = raw.indexOf('{')
  if (braceIndex >= 0) {
    const sliced = pickMessage(raw.slice(braceIndex))
    if (sliced) return sliced
  }
  return raw || '알 수 없는 오류'
}

/**
 * [PD4-NOTICE] 댓글 수 조회 — 조회 실패(네트워크·일시 5xx 등) 시 0으로 fail-open.
 * 고지는 부가 기능이라 조회 실패가 상위 지정/하위 연결 본 동작을 막아서는 안 된다
 * (0 반환 = 무고지 현행 흐름으로 진행).
 */
export async function fetchEventCommentCountSafe(eventId: string): Promise<number> {
  try {
    return await getEventCommentCount(eventId)
  } catch {
    return 0
  }
}

/**
 * 사건 시작일 비교 — JS `Date`는 BC(음수 연도) 일부 표기를 NaN으로 떨굼.
 * Papyrus는 역사 사건을 다루므로 *연·월·일 토큰을 직접 파싱*해 정수 비교한다.
 * 비교 우선순위: 연도 → 월 → 일. 입력 누락은 가장 뒤로 정렬.
 */
export function compareEventStart(
  first: string | null | undefined,
  second: string | null | undefined,
): number {
  const firstTokens = parseEventDateTokens(first)
  const secondTokens = parseEventDateTokens(second)
  if (firstTokens == null && secondTokens == null) return 0
  if (firstTokens == null) return 1
  if (secondTokens == null) return -1
  if (firstTokens.year !== secondTokens.year)
    return firstTokens.year - secondTokens.year
  if (firstTokens.month !== secondTokens.month)
    return firstTokens.month - secondTokens.month
  return firstTokens.day - secondTokens.day
}

function parseEventDateTokens(
  input: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!input) return null
  // 선택적 부호 + 1~6자리 연도, 월·일은 선택적.
  const matched = input.match(/^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!matched || !matched[1]) return null
  const year = parseInt(matched[1], 10)
  if (!Number.isFinite(year)) return null
  const month = matched[2] ? parseInt(matched[2], 10) : 1
  const day = matched[3] ? parseInt(matched[3], 10) : 1
  return { year, month, day }
}
