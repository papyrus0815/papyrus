import type { RouteObject } from 'react-router-dom'

export const dynastyRoute: RouteObject = {
  path: 'dynasty',
  lazy: async () => {
    const { default: Component } = await import('./dynasty.page')
    return { Component }
  },
}
