/** axios/일반 Error에서 사용자에게 보여줄 메시지 추출 */
export function errorMessage(err: unknown, fallback = '불러오지 못했어요'): string {
  const e = err as {
    response?: { data?: { message?: string | string[] } }
    message?: string
  }
  const msg = e?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  if (typeof msg === 'string' && msg) return msg
  if (typeof e?.message === 'string' && e.message) return e.message
  return fallback
}
