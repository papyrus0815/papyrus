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
  console.log('🔄 Layout loader 시작')

  // 세션 스토어에서 토큰 가져오기
  const { token } = useSessionStore.getState()
  console.log('🔑 세션 스토어에서 토큰 확인:', token ? '***' : null)

  // 토큰이 없으면 로그인으로 리다이렉트
  if (!token) {
    console.log('❌ 토큰 없음, 로그인으로 리다이렉트')

    return redirect(pathKeys.login())
  }

  console.log('✅ 토큰 발견, 세션 검증 진행 중...')

  // 토큰이 있으면 새 토큰 발급 시도
  try {
    console.log('🔄 토큰 리프레시 시도 중...')
    await sessionApi.refresh()
    console.log('✅ 토큰 리프레시 성공')
  } catch (error) {
    // refresh 실패 시 토큰이 유효하지 않을 수 있음
    console.warn('⚠️ 토큰 리프레시 실패, 세션 정리:', error)
    useSessionStore.getState().reset()

    return redirect(pathKeys.login())
  }

  // 세션 정보 조회
  try {
    console.log('📡 세션 데이터 로드 시도 중...')
    const session = await queryClient.ensureQueryData(sessionQueryOptions)
    console.log('✅ 세션 데이터 로드 성공:', session)

    return { session }
  } catch (error) {
    console.error('💥 세션 데이터 로드 실패:', error)
    // 세션 조회 실패 시 토큰 정리
    useSessionStore.getState().reset()

    return redirect(pathKeys.login())
  }
}

// 로더 데이터의 타입을 추론하기 위한 유틸리티 타입.
export type LayoutLoaderData = Awaited<ReturnType<typeof layoutLoader>>
