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
