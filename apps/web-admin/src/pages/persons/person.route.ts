import { RouteObject } from 'react-router-dom'

export const personsRoute: RouteObject = {
  path: 'persons',
  children: [
    {
      path: ':personId',
      lazy: async () => {
        const { default: PersonDetailPage } = await import('./person-detail.page')
        return { Component: PersonDetailPage }
      },
    },
  ],
}
