import type { RouteObject } from 'react-router'

export const genealogyRoute: RouteObject = {
  path: 'genealogy/:personId',
  lazy: async () => {
    const { default: Component } = await import('./genealogy.page')
    return { Component }
  },
}
