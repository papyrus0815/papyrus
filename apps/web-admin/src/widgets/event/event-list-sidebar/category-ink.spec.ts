import { LEDGER_CATEGORY } from '@/pages/events/ledger/styles/ledger-tokens'

import { SIDEBAR_SURFACE, categoryInk, contrastRatio } from './category-ink'

describe('categoryInk', () => {
  it('LEDGER 팔레트 전체가 사이드바 지면에서 4.5:1을 넘는다', () => {
    for (const category of Object.values(LEDGER_CATEGORY)) {
      const light = categoryInk(category.color, 'light')
      const dark = categoryInk(category.dark, 'dark')
      expect(contrastRatio(light, SIDEBAR_SURFACE.light)).toBeGreaterThanOrEqual(
        4.5,
      )
      expect(contrastRatio(dark, SIDEBAR_SURFACE.dark)).toBeGreaterThanOrEqual(
        4.5,
      )
    }
  })

  it('이미 기준을 넘는 색은 원색 그대로 둔다', () => {
    // 회담/조약(네이비)은 라이트에서 9.5:1 — 손댈 이유가 없다
    expect(categoryInk('#1e3a8a', 'light')).toBe('#1e3a8a')
    // 다크 쌍은 전부 6.6:1 이상이라 모드 전체가 무보정이다
    expect(categoryInk('#38bdf8', 'dark')).toBe('#38bdf8')
  })

  it('미달 색만 어둡게 섞는다 — 외교 하늘색 2.67:1', () => {
    const before = contrastRatio('#0ea5e9', SIDEBAR_SURFACE.light)
    const after = contrastRatio(categoryInk('#0ea5e9', 'light'), SIDEBAR_SURFACE.light)
    expect(before).toBeLessThan(4.5)
    expect(after).toBeGreaterThanOrEqual(4.5)
    expect(categoryInk('#0ea5e9', 'light')).not.toBe('#0ea5e9')
  })

  it('hex가 아니면 그대로 돌려준다', () => {
    expect(categoryInk('currentColor', 'light')).toBe('currentColor')
  })
})
