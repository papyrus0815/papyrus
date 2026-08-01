import { transformEventsFromApi } from './eventTransformers'

/**
 * transformer 정직성 회귀 가드 (2026-07-28 검토 배치 3).
 *
 * 이 파일 하나가 화면 전체의 거짓 표기를 만들던 지점이다:
 *  - 서버가 보내는 날짜 정밀도를 매핑하지 않아 연·월 정밀도 사건에 가짜 '월.일'이 찍혔고
 *  - 카테고리 미지정 사건에 DB에 없는 가짜 id를 채워 '기타'로 위장시켰다.
 * 두 필드 모두 타입에는 선언돼 있어 tsc가 잡아주지 못한다 — 그래서 테스트로 고정한다.
 */
const apiEvent = (over: Record<string, unknown> = {}) =>
  ({
    id: 'evt-1',
    title: '테스트 사건',
    description: '설명',
    startDate: '2023-12-31',
    endDate: null,
    category: { id: 'cat-uuid-1', name: '정치' },
    childEvents: [],
    eventImages: [],
    relatedCountries: [],
    relatedHistoricalCountries: [],
    ...over,
  }) as never

describe('transformEventsFromApi — 날짜 정밀도', () => {
  it('startDatePrecision / endDatePrecision을 그대로 싣는다', () => {
    const [event] = transformEventsFromApi([
      apiEvent({
        startDatePrecision: 'year',
        endDate: '2024-06-30',
        endDatePrecision: 'month',
      }),
    ])

    expect(event.startDatePrecision).toBe('year')
    expect(event.endDatePrecision).toBe('month')
  })

  it('계층 노드의 period에도 정밀도를 싣는다 — 노드만 받는 소비처(요약 모달·트리)용', () => {
    const [event] = transformEventsFromApi([
      apiEvent({ startDatePrecision: 'month', endDate: null }),
    ])

    expect(event.hierarchy.period.startPrecision).toBe('month')
    expect(event.hierarchy.period.endPrecision).toBeUndefined()
  })

  it('서버가 정밀도를 안 보내면 undefined — 임의의 기본값을 만들지 않는다', () => {
    const [event] = transformEventsFromApi([apiEvent()])
    expect(event.startDatePrecision).toBeUndefined()
  })
})

describe('transformEventsFromApi — 카테고리', () => {
  it('카테고리가 있으면 실제 id와 이름을 쓴다', () => {
    const [event] = transformEventsFromApi([apiEvent()])
    expect(event.categoryId).toBe('cat-uuid-1')
    expect(event.category).toBe('정치')
  })

  it('미지정이면 가짜 id를 만들지 않고 라벨만 미분류로 파생한다', () => {
    const [event] = transformEventsFromApi([apiEvent({ category: null })])

    // 예전엔 'cat-other-001'을 채웠다 — DB의 '기타'(uuid)와 절대 매칭되지 않아
    // 필터로는 못 잡으면서 화면에는 분류된 것처럼 보였다.
    expect(event.categoryId).toBe('')
    expect(event.categoryId).not.toContain('cat-other')
    expect(event.category).toBe('미분류')
  })
})
