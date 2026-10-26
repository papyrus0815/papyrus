import { parseDurationMs } from './duration.util'

describe('parseDurationMs', () => {
  it.each([
    ['15m', 15 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
    ['90d', 90 * 24 * 60 * 60 * 1000],
    ['1h', 60 * 60 * 1000],
    ['500ms', 500],
    ['3600', 3600 * 1000],
    [3600, 3600 * 1000],
  ])('%p → %p', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected)
  })

  it.each([undefined, null, '', 'abc', '0', '-5m', 0])('해석 불가 %p → null', (input) => {
    expect(parseDurationMs(input as Parameters<typeof parseDurationMs>[0])).toBeNull()
  })
})
