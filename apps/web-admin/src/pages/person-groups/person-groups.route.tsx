import type { RouteObject } from 'react-router-dom'

/**
 * /person-groups — 인물 묶음 허브.
 * 좌측 묶음 목록은 레이아웃(ContentAreaShell)이 소유하므로 목록↔상세를 오가도 유지된다.
 */
export const personGroupsRoutes: RouteObject[] = [
  {
    path: 'person-groups',
    children: [
      {
        index: true,
        lazy: async () => {
          const { default: Component } = await import('./person-groups-list.page')
          return { Component }
        },
      },
      {
        path: ':groupId',
        lazy: async () => {
          const { default: Component } = await import('./person-group-detail.page')
          return { Component }
        },
      },
    ],
  },
]
