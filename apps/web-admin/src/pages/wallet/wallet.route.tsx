import { RouteObject } from 'react-router'

/** /shop — 파피 상점 (지갑·포인트 환전·코스메틱 구매·인벤토리) */
export const walletRoute: RouteObject = {
  path: 'shop',
  lazy: async () => {
    const { default: Component } = await import('./wallet.page')
    return { Component }
  },
}
