import { RouteObject } from 'react-router'

/** /profile/:accountId — 공개 프로필(타 사용자 등급·뱃지) */
export const publicProfileRoute: RouteObject = {
  path: 'profile/:accountId',
  lazy: async () => {
    const { default: Component } = await import('./public-profile.page')
    return { Component }
  },
}
