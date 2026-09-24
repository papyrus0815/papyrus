import { yearSpanGeometry, type YearSpanGeometry } from './year-span'

const parts = (year: number, month: number, day: number) => ({ year, month, day })

/** 축 위에 놓인 결과만 통과시키는 좁히기 — 밖(`outside`)으로 나오면 그 자체가 실패다. */
const placed = (span: ReturnType<typeof yearSpanGeometry>): YearSpanGeometry => {
  if (!span || span.outside)
    throw new Error(`축 위에 놓이지 않았다: ${JSON.stringify(span)}`)
  return span
}

describe('yearSpanGeometry', () => {
  it('시작 날짜가 없으면 놓을 수 없다', () => {
    expect(yearSpanGeometry({ scopeYear: 1911, start: null, end: null })).toBeNull()
  })

  it('당일 사건은 그 해 안의 점이다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 4, 27),
        end: parts(1911, 4, 27),
      }),
    )
    expect(geo.isPoint).toBe(true)
    // 4.27 = 통년 116일차(평년) → 116/365
    expect(geo.start).toBeCloseTo(116 / 365, 5)
  })

  it('기간 사건은 시작~종료를 덮고, 종료일 **당일까지** 포함한다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 1, 1),
        end: parts(1911, 12, 31),
      }),
    )
    expect(geo.start).toBe(0)
    expect(geo.end).toBe(1)
    expect(geo.isPoint).toBe(false)
  })

  it('이 해 이전에 시작한 사건은 좌측이 잘린다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1898, 3, 1),
        end: parts(1911, 6, 30),
      }),
    )
    expect(geo.clippedStart).toBe(true)
    expect(geo.clippedEnd).toBe(false)
    expect(geo.start).toBe(0)
    expect(geo.end).toBeLessThan(1)
  })

  it('이 해 이후까지 이어지는 사건은 우측이 잘린다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 9, 29),
        end: parts(1912, 10, 18),
      }),
    )
    expect(geo.clippedEnd).toBe(true)
    expect(geo.end).toBe(1)
    expect(geo.start).toBeGreaterThan(0.7)
  })

  it('양쪽으로 넘치는 사건은 트랙을 가득 채운다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1916,
        start: parts(1914, 7, 28),
        end: parts(1918, 11, 11),
      }),
    )
    expect(geo).toEqual(
      expect.objectContaining({
        start: 0,
        end: 1,
        clippedStart: true,
        clippedEnd: true,
        isPoint: false,
      }),
    )
  })

  it('연 정밀도는 1월 1일 점이 아니라 그 해 전체를 근사로 칠한다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 1, 1),
        end: null,
        startPrecision: 'year',
      }),
    )
    expect(geo.approximate).toBe(true)
    expect(geo.isPoint).toBe(false)
    expect(geo.start).toBe(0)
    expect(geo.end).toBe(1)
  })

  it('월 정밀도는 그 달 전체를 덮는다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 7, 1),
        end: null,
        startPrecision: 'month',
      }),
    )
    expect(geo.approximate).toBe(true)
    // 7월 1일(181) ~ 8월 1일(212)
    expect(geo.start).toBeCloseTo(181 / 365, 5)
    expect(geo.end).toBeCloseTo(212 / 365, 5)
  })

  it('12월은 달의 끝이 연말이다 — month + 1을 그대로 넘기면 12월 1일로 되돌아간다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 12, 1),
        end: null,
        startPrecision: 'month',
      }),
    )
    expect(geo.end).toBe(1)
    expect(geo.end).toBeGreaterThan(geo.start)
  })

  it('윤년은 3월 이후 위치를 한 칸 민다', () => {
    const leap = placed(
      yearSpanGeometry({
        scopeYear: 1912,
        start: parts(1912, 3, 1),
        end: parts(1912, 3, 1),
      }),
    )
    const common = placed(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1911, 3, 1),
        end: parts(1911, 3, 1),
      }),
    )
    expect(leap.start).toBeCloseTo(60 / 366, 5)
    expect(common.start).toBeCloseTo(59 / 365, 5)
  })

  it('연 그룹이 없으면(평면 보기) 사건 자신의 해를 축으로 삼는다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: null,
        start: parts(1911, 4, 27),
        end: parts(1911, 4, 27),
      }),
    )
    expect(geo.isPoint).toBe(true)
    expect(geo.start).toBeCloseTo(116 / 365, 5)
  })

  it('연 축 밖의 행은 막대를 지어내지 않고 어느 쪽 바깥인지만 말한다', () => {
    // 하위 사건은 부모의 버킷을 따라오므로 실제로 생기는 상태다.
    expect(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1920, 1, 1),
        end: parts(1920, 2, 1),
      }),
    ).toEqual({ outside: 'after' })
    expect(
      yearSpanGeometry({
        scopeYear: 1911,
        start: parts(1850, 1, 1),
        end: parts(1900, 1, 1),
      }),
    ).toEqual({ outside: 'before' })
  })

  it('BC 연도를 네이티브 Date로 흘리지 않는다 — 기원전 44년도 같은 축에 놓인다', () => {
    const geo = placed(
      yearSpanGeometry({
        scopeYear: -44,
        start: parts(-44, 3, 15),
        end: parts(-44, 3, 15),
      }),
    )
    expect(geo.isPoint).toBe(true)
    expect(geo.start).toBeGreaterThan(0.19)
    expect(geo.start).toBeLessThan(0.21)
  })
})
