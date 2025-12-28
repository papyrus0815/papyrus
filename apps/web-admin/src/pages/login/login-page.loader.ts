import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { pathKeys } from '@/shared/router'
import { useSessionStore } from '@/entities/session'

/**
 * 🛡️ 로그인 페이지 접근 제어(guard) 로더.
 *
 * 이미 로그인된 사용자가 로그인 페이지에 접근하면 홈으로 리디렉션함.
 * 토큰 존재 여부만 확인하여 불필요한 API 호출을 방지함.
 */
export default function loginPageLoader(_: LoaderFunctionArgs) {
  const { token } = useSessionStore.getState()

  // 토큰이 있으면 바로 홈으로 리디렉션 (API 호출 없이)
  if (token) {
    return redirect(pathKeys.home())
  }

  // 토큰이 없으면 로그인 페이지 렌더링 허용
  return null
}
