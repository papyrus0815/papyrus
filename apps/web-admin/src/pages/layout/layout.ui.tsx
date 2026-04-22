import { Suspense } from 'react'

import { Outlet, useLoaderData, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { useSessionStore } from '@/entities/session'
import dnNunonchonKyungmae from '@/shared/assets/bgm/Dn_Nunonchon_Kyungmae.mp3'
import etMiniGame from '@/shared/assets/bgm/Et_MiniGame.mp3'
import flChinaVillage from '@/shared/assets/bgm/Fl_ChinaVillage.mp3'
import flChosunVillage from '@/shared/assets/bgm/Fl_ChosunVillage.mp3'
import flJapanVillage from '@/shared/assets/bgm/Fl_JapanVillage.mp3'
import dashboardBgm2 from '@/shared/assets/sound/dashboard bgm 2.mp3'
import dashboardBgm3 from '@/shared/assets/sound/dashboard bgm 3.mp3'
import dashboardBgm from '@/shared/assets/sound/dashboard bgm.mp3'
import { useBgmPlaylist } from '@/shared/hooks/use-bgm-playlist.hook'
import { logError } from '@/shared/ui/error-handler/error-handler.lib'
import { ErrorHandler } from '@/shared/ui/error-handler/error.handler.ui'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'
import DashboardSkeleton from '@/shared/ui/skeleton/dashboard-skeleton.ui'
import HistorySkeleton from '@/shared/ui/skeleton/history-skeleton.ui'
import LayoutSkeleton from '@/shared/ui/skeleton/layout-skeleton.ui'
import {
  CommandPalette,
  useCommandPaletteShortcut,
} from '@/widgets/command-palette'
import Header from '@/widgets/header/header.ui'

// Note: Simple layout only, wrapper removed per request

import { type LayoutLoaderData } from './layout.loader'

// 공용 SectionTitle 사용

/**
 * 🏛️ 애플리케이션의 메인 레이아웃.
 *
 * loader로부터 직접 세션 데이터를 받아 사용자 인증 상태에 따라
 * 다른 네비게이션 링크를 동적으로 렌더링합니다.
 */
export default function Layout() {
  // 💡 useLoaderData: loader 함수가 반환한 데이터를 즉시 사용.
  // 컴포넌트 내에서 별도의 데이터 fetching 로직이 필요 없어짐.
  const loaderData = useLoaderData() as LayoutLoaderData
  const session = 'session' in loaderData ? loaderData.session : null
  const { token } = useSessionStore()
  const isAuthenticated = !!session || !!token
  const location = useLocation()

  const isPanelsRoute = location.pathname.startsWith('/history')
  const isDashboardRoute = location.pathname === '/'

  useCommandPaletteShortcut()

  // 대시보드 BGM 플레이리스트 재생 (로그인 페이지를 제외한 모든 페이지)
  // 볼륨을 0.1로 설정하여 클릭 사운드가 잘 들리도록 함
  // 랜덤 재생 활성화
  useBgmPlaylist({
    playlist: [
      dashboardBgm,
      dashboardBgm2,
      dashboardBgm3,
      dnNunonchonKyungmae,
      etMiniGame,
      flChinaVillage,
      flChosunVillage,
      flJapanVillage,
    ],
    initialVolume: 0.1,
    autoPlay: true,
    shuffle: true,
  })

  // 라우트별 적절한 스켈레톤 선택
  const getSkeleton = () => {
    if (isDashboardRoute) return <DashboardSkeleton />
    if (isPanelsRoute) return <HistorySkeleton />
    return <LayoutSkeleton showSidebar={false} />
  }

  return (
    <>
      {/* 대시보드 헤더를 전역 공통으로 사용 */}
      {isAuthenticated && <Header />}

      <SmartErrorBoundary FallbackComponent={ErrorHandler} onError={logError}>
        {/* Suspense: Outlet의 페이지들이 lazy-loading 될 때 로딩 UI를 보여줌 */}
        <Suspense fallback={getSkeleton()}>
          <Outlet />
        </Suspense>
      </SmartErrorBoundary>

      {isAuthenticated && <CommandPalette />}
    </>
  )
}
