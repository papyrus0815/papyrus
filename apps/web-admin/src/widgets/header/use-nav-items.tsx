/**
 * 전역 내비게이션 항목 정의 — 상단 헤더와 좌측 레일이 같은 목록을 쓰도록 분리했다.
 *
 * 항목은 11개: 국가·사건·인물·저원·군사·가문·민족·집단·대륙·수장 비교·기업.
 * 인물은 대시보드 메뉴에서 오지만 순서상 사건 다음이라 따로 끼워 넣는다.
 */
import React, { useMemo } from 'react'

import { FiAward, FiBriefcase, FiGlobe, FiLayers, FiMap } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import { DASHBOARD_MENU_ITEMS } from '@/widgets/content-shell/model/dashboard-menu-items'

export interface NavItemSpec {
  key: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
  active?: boolean
}

export function useNavItems(): NavItemSpec[] {
  const navigate = useNavigate()
  const location = useLocation()
  const playClickSound = useClickSound()

  return useMemo(() => {
    const go = (path: string) => () => {
      playClickSound()
      navigate(path)
    }

    const dashboardItemToSpec = (
      item: (typeof DASHBOARD_MENU_ITEMS)[number],
    ): NavItemSpec => {
      const Icon = item.icon
      return {
        key: `dashboard-${item.id}`,
        label: item.label,
        icon: (
          <span style={{ width: 16, height: 16, display: 'inline-flex' }}>
            <Icon />
          </span>
        ),
        onClick: go(item.path),
        active: item.matchPath(location.pathname),
      }
    }

    const personItem = DASHBOARD_MENU_ITEMS.find((item) => item.id === 'person')
    const restDashboardItems = DASHBOARD_MENU_ITEMS.filter(
      (item) => item.id !== 'person',
    )

    return [
      {
        key: 'countries',
        label: '국가',
        icon: <FiMap size={16} />,
        onClick: go(pathKeys.country()),
        // 국가 브라우즈(/country)와 상세(/country/:id/*) 모두 활성 표시
        active: /^\/country(\/|$)/.test(location.pathname),
      },
      {
        key: 'events',
        label: '사건',
        icon: <FiLayers size={16} />,
        onClick: go('/events'),
        active: location.pathname.startsWith('/events'),
      },
      ...(personItem ? [dashboardItemToSpec(personItem)] : []),
      ...restDashboardItems.map(dashboardItemToSpec),
      {
        key: 'continents',
        label: '대륙',
        icon: <FiGlobe size={16} />,
        onClick: go(pathKeys.continents()),
        active: location.pathname.startsWith('/continents'),
      },
      {
        key: 'heads-of-state',
        label: '수장 비교',
        icon: <FiAward size={16} />,
        onClick: go(pathKeys.headsOfState()),
        active: location.pathname.startsWith('/heads-of-state'),
      },
      {
        key: 'companies',
        label: '기업',
        icon: <FiBriefcase size={16} />,
        onClick: go('/companies'),
        active: location.pathname.startsWith('/companies'),
      },
    ]
  }, [location.pathname, navigate, playClickSound])
}
