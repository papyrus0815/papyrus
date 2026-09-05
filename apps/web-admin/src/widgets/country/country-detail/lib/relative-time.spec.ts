import { formatRelativeTime } from './relative-time'

const NOW = new Date('2026-09-05T12:00:00Z').getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const DAY = 86_400_000

describe('formatRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('7일 미만은 일 단위', () => {
    expect(formatRelativeTime(ago(30_000))).toBe('방금 전')
    expect(formatRelativeTime(ago(5 * 60_000))).toBe('5분 전')
    expect(formatRelativeTime(ago(3 * 3_600_000))).toBe('3시간 전')
    expect(formatRelativeTime(ago(3 * DAY))).toBe('3일 전')
  })

  // 회귀: 예전엔 7일이 넘으면 무엇이든 '1주일 전'으로 잘려, 21일 전 기록도
  // '1주일 전'이라고 거짓으로 표시됐다.
  it('7일 이상은 주·개월·연 단위로 올라간다', () => {
    expect(formatRelativeTime(ago(7 * DAY))).toBe('1주 전')
    expect(formatRelativeTime(ago(21 * DAY))).toBe('3주 전')
    expect(formatRelativeTime(ago(45 * DAY))).toBe('1개월 전')
    expect(formatRelativeTime(ago(200 * DAY))).toBe('6개월 전')
    expect(formatRelativeTime(ago(400 * DAY))).toBe('1년 전')
  })

  it('미래 시각과 깨진 값은 조용히 수렴한다', () => {
    expect(formatRelativeTime(new Date(NOW + 5 * DAY).toISOString())).toBe('방금 전')
    expect(formatRelativeTime('not-a-date')).toBe('')
  })
})
