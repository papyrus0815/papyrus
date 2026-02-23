import { queryClient } from '@/shared/queryClient'
import { sessionQueryOptions } from '@/entities/session/session.api'
import { sessionApi } from '@/entities/session/session.api'
import { useSessionStore } from '@/entities/session'
import { redirect } from 'react-router-dom'
import { pathKeys } from '@/shared/router'

/**
 * 🖼️ 메인 레이아웃과 모든 자식 페이지를 위한 데이터 로더.
 *
 * 이 로더는 레이아웃이 렌더링되기 전에 실행되어 필요한 데이터를 미리 가져옵니다.
 * 토큰이 있는 경우에만 사용자 세션 정보를 로드합니다.
 */
export async function layoutLoader() {
  const { token } = useSessionStore.getState()
  if (!token) {
    return redirect(pathKeys.login())
  }

  try {
    await sessionApi.refresh()
  } catch {
    useSessionStore.getState().reset()
    return redirect(pathKeys.login())
  }

  try {
    const session = await queryClient.ensureQueryData(sessionQueryOptions)
    return { session }
  } catch {
    useSessionStore.getState().reset()
    return redirect(pathKeys.login())
  }
}

// 로더 데이터의 타입을 추론하기 위한 유틸리티 타입.
export type LayoutLoaderData = Awaited<ReturnType<typeof layoutLoader>>
