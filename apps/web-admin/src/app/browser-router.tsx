import React, { Suspense, useEffect, useState } from 'react'

import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
  redirect,
  useRouteError,
} from 'react-router-dom'

// Spinner는 사용하지 않으므로 import 제거
import { useSessionStore } from '@/entities/session/session.store'
// FSD 구조에 맞는 static imports (지연 로딩 제거)
import { administrationDepartmentsRoutes } from '@/pages/administration-departments/administration-departments.route'
import { dashboardRoute } from '@/pages/dashboard/dashboard.route'
import { organizationsRoutes } from '@/pages/organizations/organizations.route'
import { eventPageRoute } from '@/pages/events/event-route'
import { historyPageRoute } from '@/pages/history/history.route'
import { layoutLoader } from '@/pages/layout/layout.loader'
import Layout from '@/pages/layout/layout.ui'
import { loginPageRoute } from '@/pages/login/login-page.route'
import { page404Route } from '@/pages/page-404/page-404.route'
import { personsRoute } from '@/pages/persons/persons.route'
// history, panels 제거됨 (연관 위젯 파일 정리)
import { ServiceManagerPage } from '@/pages/services/service-manager.page'
import { pathKeys } from '@/shared/router'

/**
 * 🚀 클라이언트 사이드 전용 라우터 컴포넌트
 * SSR/Hydration 문제를 완전히 방지
 */
function ClientRouter({
  router,
}: {
  router: ReturnType<typeof createAppRouter>
}) {
  // React Router v7에서 hydration 문제를 방지하기 위해 조건부 렌더링
  const [isReady, setIsReady] = useState(true) // 즉시 렌더링으로 변경

  useEffect(() => {
    // 이미 true로 설정되어 있으므로 추가 로직 불필요
    setIsReady(true)
  }, [])

  // React Router v7에서 권장하는 방식으로 렌더링
  try {
    // RouterProvider 대신 더 안전한 방식 사용
    return (
      <Suspense fallback={null}>
        <div
          data-router-ready="true"
          suppressHydrationWarning
          style={{ display: 'contents' }}
        >
          <RouterProvider router={router} fallbackElement={null} />
        </div>
      </Suspense>
    )
  } catch (error) {
    // hydration 오류 발생 시 fallback 표시
    console.warn('Router hydration error, showing fallback:', error)

    return null
  }
}

/**
 * 🚀 Redux Persist 상태 복구 후 라우터를 활성화하는 컴포넌트.
 *
 * 로컬 스토리지에서 사용자 인증 정보 등이 로드되기 전에
 * 페이지가 렌더링되어 발생하는 문제를 방지함.
 */
export function BootstrappedRouter() {
  const [router, setRouter] = useState<ReturnType<
    typeof createAppRouter
  > | null>(() => {
    // 초기 렌더링 시 즉시 라우터 생성 (SSR/클라이언트 체크)
    if (typeof window !== 'undefined') {
      return createAppRouter()
    }
    return null
  })

  useEffect(() => {
    // 라우터가 없으면 생성 (fallback)
    if (!router && typeof window !== 'undefined') {
      const zustandReady = useSessionStore.persist?.hasHydrated?.() ?? true

      if (zustandReady) {
        setRouter(createAppRouter())
      } else {
        // Zustand hydration 대기
        const offFinishHydration =
          useSessionStore.persist?.onFinishHydration?.(() => {
            setRouter(createAppRouter())
          }) || (() => {})
        return offFinishHydration
      }
    }
  }, [router])

  // 라우터가 준비되면 앱 렌더링
  if (!router) {
    return null
  }

  return <ClientRouter router={router} />
}

/**
 * 🗺️ 앱 라우트 설정.
 * React Router v7에 맞게 최적화됨.
 */
const appRouterConfig = [
  {
    // 최상위 에러 바운더리. 모든 자식 라우트의 에러를 위로 전달.
    errorElement: <BubbleError />,
    children: [
      {
        // 로그인 등 레이아웃을 사용하지 않는 공개 라우트 그룹
        element: <Outlet />,
        children: [
          loginPageRoute,
          {
            // 서비스 관리 페이지 (독립 페이지)
            path: 'services',
            element: <ServiceManagerPage />,
          },
        ],
      },
      {
        // 메인 레이아웃을 공유하는 라우트 그룹 (정적 임포트로 전환)
        element: <Layout />,
        loader: layoutLoader,
        children: [
          // 루트: 홈 (Dashboard)
          dashboardRoute,
          // 이벤트 페이지 라우트
          eventPageRoute,
          // 인물 라우트
          personsRoute,
          // 행정부처 라우트
          ...administrationDepartmentsRoutes,
          // 행정기구·조직 라우트
          ...organizationsRoutes,
          // 히스토리 그룹 하위 라우트
          historyPageRoute,
        ],
      },
      {
        // 📄 메인 레이아웃을 사용하지 않는 페이지 그룹 (e.g. 404)
        element: <Outlet />,
        children: [page404Route],
      },
      {
        // ❓ 정의되지 않은 모든 경로를 404 페이지로 리디렉션
        path: '*',
        loader: async () => redirect(pathKeys.page404()),
      },
    ],
  },
]

/** 라우터 인스턴스 생성 함수 */
const createAppRouter = () => createBrowserRouter(appRouterConfig)

/**
 * 💥 React Router의 에러를 상위 React ErrorBoundary로 전달(bubble up)하는 역할.
 *
 * React Router v6.4+의 `errorElement`는 자체적으로 에러를 처리하므로,
 * 이 컴포넌트가 없으면 전역 ErrorBoundary가 라우터 에러를 감지하지 못함.
 * `useRouteError`로 에러를 잡아서 다시 `throw`하는 트릭을 사용.
 */
function BubbleError() {
  const error = useRouteError()

  if (error) {
    throw error
  }

  return null
}
