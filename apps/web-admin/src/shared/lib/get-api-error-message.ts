import axios from 'axios'

/**
 * axios / Nest 응답에서 사용자에게 보여줄 메시지 문자열 추출
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = '요청 처리 중 오류가 발생했습니다.',
): string {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data as
      | string
      | { message?: string | string[] | { message?: string }; errors?: unknown }
      | undefined

    if (typeof d === 'string' && d.trim()) return d

    if (d && typeof d === 'object') {
      const m = d.message
      if (typeof m === 'string' && m.trim()) return m
      if (Array.isArray(m) && m.length) return m.filter(Boolean).join(', ')
      if (m && typeof m === 'object' && 'message' in m) {
        const inner = (m as { message?: string }).message
        if (typeof inner === 'string' && inner.trim()) return inner
      }
      if (d.message === 'Validation failed' && Array.isArray((d as any).errors)) {
        const errs = (d as any).errors as Array<{
          property?: string
          constraints?: Record<string, string>
        }>
        return errs
          .map((e) => {
            const c = e.constraints
              ? Object.values(e.constraints).join(', ')
              : ''
            return e.property ? `${e.property}: ${c}` : c
          })
          .filter(Boolean)
          .join('; ')
      }
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/**
 * fetch 응답 **본문 문자열**에서 사용자용 메시지를 뽑는다(axios를 거치지 않는 래퍼용).
 *
 * 이 API의 전역 예외 필터는 `{ success:false, …, error: { message } }`로 감싸 보내고,
 * Nest 기본 형식은 `{ message }`(문자열 또는 배열)다. 둘 다 아니면 null —
 * 호출부가 `HTTP 400` 같은 폴백을 쓴다. 본문을 그대로 메시지로 쓰면 토스트에
 * `{"success":false,"timestamp":…` JSON 원문이 떴다(기업 상세 검토 F2).
 */
export function apiErrorMessageFromBody(body: string | null | undefined): string | null {
  const text = body?.trim() ?? ''
  if (!text) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // JSON이 아닌 짧은 평문은 그대로, HTML 오류 페이지 등 긴 본문은 버린다
    return text.length <= 200 && !text.startsWith('<') ? text : null
  }
  const pick = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const joined = value.filter((item) => typeof item === 'string' && item.trim()).join(', ')
      return joined || null
    }
    return null
  }
  if (parsed && typeof parsed === 'object') {
    const record = parsed as { error?: unknown; message?: unknown }
    if (record.error && typeof record.error === 'object') {
      const nested = pick((record.error as { message?: unknown }).message)
      if (nested) return nested
    }
    return pick(record.message) ?? pick(record.error)
  }
  return null
}
