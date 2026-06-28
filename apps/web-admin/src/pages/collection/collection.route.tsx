import { RouteObject } from 'react-router'

/** /collection — 유물관 (역사 유물 수집·진열) */
export const collectionRoute: RouteObject = {
  path: 'collection',
  lazy: async () => {
    const { default: Component } = await import('./collection.page')
    return { Component }
  },
}
