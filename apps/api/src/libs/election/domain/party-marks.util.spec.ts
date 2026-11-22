import { normalizeColorPalette } from './party-marks.util'

describe('정당 상징색 배열', () => {
  it('#RRGGBB로 정규화(대문자·# 보강)·중복 제거', () => {
    expect(normalizeColorPalette(['#000000', 'ff0000', '#FF0000'])).toEqual({ value: ['#000000', '#FF0000'], error: null })
  })
  it('비면 null', () => {
    expect(normalizeColorPalette([])).toEqual({ value: null, error: null })
    expect(normalizeColorPalette(null)).toEqual({ value: null, error: null })
  })
  it('형식·개수·타입 오류', () => {
    expect(normalizeColorPalette(['#12']).error).toMatch(/형식/)
    expect(normalizeColorPalette('#000000').error).toMatch(/배열/)
    expect(normalizeColorPalette(Array.from({ length: 13 }, (_, index) => `#0000${String(index).padStart(2, '0')}`)).error).toMatch(/12개/)
  })
})
