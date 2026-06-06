import { RouteObject } from 'react-router'

/** /profile — 내 프로필 (계정 정보·등급·뱃지) */
export const profileRoute: RouteObject = {
  path: 'profile',
  lazy: async () => {
    const { default: Component } = await import('./profile.page')
    return { Component }
  },
}
