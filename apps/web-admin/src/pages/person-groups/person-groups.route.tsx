import type { RouteObject } from 'react-router-dom'

export const personGroupsRoutes: RouteObject[] = [
  {
    path: 'person-groups',
    lazy: async () => {
      const { default: Component } = await import('./person-groups-list.page')
      return { Component }
    },
  },
  {
    path: 'person-groups/:groupId',
    lazy: async () => {
      const { default: Component } = await import('./person-group-detail.page')
      return { Component }
    },
  },
]
