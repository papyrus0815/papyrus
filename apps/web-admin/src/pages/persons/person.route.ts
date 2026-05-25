import { redirect, type RouteObject } from 'react-router-dom'

import { pathKeys } from '@/shared/router'

export const personsRoute: RouteObject = {
  path: 'persons',
  children: [
    {
      // /persons/ → 인물 목록은 history 대시보드에서 관리
      index: true,
      loader: () => redirect(pathKeys.personsTimeline()),
    },
    {
      // /persons/create/
      path: 'create',
      lazy: async () => {
        const { default: Component } = await import('./person-edit.page')
        return { Component }
      },
    },
    {
      // /persons/:personId/
      path: ':personId',
      children: [
        {
          index: true,
          lazy: async () => {
            const { default: Component } = await import('./person-detail.page')
            return { Component }
          },
        },
        {
          // /persons/:personId/edit/
          path: 'edit',
          lazy: async () => {
            const { default: Component } = await import('./person-edit.page')
            return { Component }
          },
        },
      ],
    },
  ],
}
