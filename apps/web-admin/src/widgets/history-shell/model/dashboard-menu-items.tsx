import React from 'react'

import { pathKeys } from '@/shared/router'

export type DashboardContentView =
  | 'person'
  | 'legislature'
  | 'military'
  | 'dynasty'
  | 'ethnicity'

export const IconPeople = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconLegislature = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 21h18M3 7v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7h18M3 7v-.7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v.7" />
    <path d="M8 12v6M12 12v6M16 12v6" />
  </svg>
)

const IconMilitary = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconDynasty = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
)

const IconEthnicity = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M12 12v.01M12 6v.01M12 18v.01" />
  </svg>
)

export interface DashboardMenuItem {
  id: DashboardContentView
  label: string
  icon: React.ComponentType
  /** 전역 헤더에서 사용할 라우트 경로 */
  path: string
  /** 현재 pathname이 이 메뉴에 해당하는지 판정 */
  matchPath: (pathname: string) => boolean
}

export const DASHBOARD_MENU_ITEMS: DashboardMenuItem[] = [
  {
    id: 'person',
    label: '인물',
    icon: IconPeople,
    path: pathKeys.history.dashboardPersons(),
    matchPath: (p) => /\/history\/dashboard\/persons(\/.*)?$/.test(p),
  },
  {
    id: 'legislature',
    label: '저원',
    icon: IconLegislature,
    path: pathKeys.history.dashboardLegislature(),
    matchPath: (p) => /\/history\/dashboard\/legislature\/?$/.test(p),
  },
  {
    id: 'military',
    label: '군사',
    icon: IconMilitary,
    path: pathKeys.history.dashboardMilitary(),
    matchPath: (p) => /\/history\/dashboard\/military\/?$/.test(p),
  },
  {
    id: 'dynasty',
    label: '가문',
    icon: IconDynasty,
    // 가문은 history 대시보드 밖으로 이동(/dynasty 풀 페이지). 메뉴는 보존.
    path: pathKeys.dynasty(),
    matchPath: (p) => /^\/dynasty\/?$/.test(p),
  },
  {
    id: 'ethnicity',
    label: '민족',
    icon: IconEthnicity,
    path: pathKeys.history.dashboardEthnicity(),
    matchPath: (p) => /\/history\/dashboard\/ethnicity\/?$/.test(p),
  },
]
