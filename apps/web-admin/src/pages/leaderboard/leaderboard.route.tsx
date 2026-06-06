import { RouteObject } from 'react-router'

/** /leaderboard — 게이미피케이션 리더보드 (등급/뱃지/랭킹) */
export const leaderboardRoute: RouteObject = {
  path: 'leaderboard',
  lazy: async () => {
    const { default: Component } = await import('./leaderboard.page')
    return { Component }
  },
}
