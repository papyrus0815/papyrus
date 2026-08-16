/**
 * 타임라인 v4 순수 모델 스펙 — BC 경계·10등분 규약·패킹 불변식.
 */
import {
  buildTimelinePoints,
  centuryGapCount,
  centuryOverview,
  continuingIntoCenturyCount,
  describeWindow,
  formatSpan10Label,
  groupPointsForList,
  packSpanRows,
  parentWindow,
  parseTimelineWindow,
  pointsStartingInWindow,
  serializeTimelineWindow,
  span10BucketsOf,
  span10StartOf,
  windowContainingPoint,
  windowContainsPoint,
  windowYearRange,
  yearBucketsOf,
  type TimelinePoint,
  type TimelineSourceItem,
} from './timeline-model'

const item = (
  id: string,
  start: string | null,
  end: string | null = null,
  overrides: Partial<TimelineSourceItem['node']> & {
    depth?: number
    parentNodeId?: string | null
    parentEvent?: { id: string; title: string } | null
  } = {},
): TimelineSourceItem => ({
  node: {
    id,
    title: overrides.title ?? `사건 ${id}`,
    period: { start: start ?? undefined, end: end ?? undefined },
    importance: overrides.importance ?? null,
  },
  depth: overrides.depth ?? 0,
  parentNodeId: overrides.parentNodeId ?? null,
  parentEvent: overrides.parentEvent ?? null,
})

const point = (
  id: string,
  startYearInt: number | null,
  endYearInt: number | null = startYearInt,
  overrides: Partial<TimelinePoint> = {},
): TimelinePoint => ({
  id,
  title: overrides.title ?? `사건 ${id}`,
  category: overrides.category ?? '정치',
  importance: overrides.importance ?? 'normal',
  startYearInt,
  startYear: startYearInt,
  endYear: endYearInt,
  endYearInt,
  startDate: null,
  endDate: null,
  depth: overrides.depth ?? 0,
  startPrecision: null,
  parentId: null,
  parentTitle: null,
  ...overrides,
})

describe('buildTimelinePoints', () => {
  it('BC 날짜를 부호 연도로 파싱한다(네이티브 Date 경유 금지 규약)', () => {
    const [built] = buildTimelinePoints(
      [item('a', '-0044-03-15', null)],
      [{ id: 'a', category: '정치' }],
    )
    expect(built.startYearInt).toBe(-44)
    expect(built.startYear).toBeLessThan(-43)
    expect(built.startYear).toBeGreaterThan(-44)
  })

  it('시작일 미상 사건을 버리지 않고 미상 포인트로 남긴다', () => {
    const built = buildTimelinePoints([item('a', null)], [])
    expect(built).toHaveLength(1)
    expect(built[0].startYearInt).toBeNull()
    expect(built[0].category).toBe('기타')
  })

  it('연도 0(천문학 0년)은 BC 1로 정규화된다 — 모수 일치 불변식(검토 R4)', () => {
    const [built] = buildTimelinePoints([item('a', '0000-06-01', null)], [])
    expect(built.startYearInt).toBe(-1)
    // 전체(세기) → 세기 → 10년 구간 어느 단계에서도 같은 버킷 체인에 잡힌다.
    const { buckets } = centuryOverview([built])
    expect(buckets.map((bucket) => bucket.century)).toEqual([-1])
    const spanBuckets = span10BucketsOf([built], -1)
    expect(spanBuckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1)
    expect(spanBuckets[9].startYear).toBe(-10)
    expect(spanBuckets[9].count).toBe(1)
    // 창 왕복도 성립 — 예전엔 d0으로 직렬화돼 재파싱이 null이었다.
    const target = windowContainingPoint(built)
    expect(target).toEqual({ level: 'span10', startYear: -10 })
    expect(parseTimelineWindow(serializeTimelineWindow(target))).toEqual(target)
    expect(windowContainsPoint(target, built)).toBe(true)
  })

  it('종료가 시작보다 앞서면 시작으로 클램프한다', () => {
    const [built] = buildTimelinePoints(
      [item('a', '1900-06-01', '1899-01-01')],
      [],
    )
    expect(built.endYear).toBe(built.startYear)
  })

  it('12월 31일도 자기 연도 좌표에 남는다 — [0,1) 보장(검토 R18)', () => {
    // day/31이던 시절 1880-12-31이 정확히 1881.0이 되어 자기 창 밴드에서
    // 빠지고(리스트와 불일치) 다음 창의 잘림 표기도 누락됐다.
    const [built] = buildTimelinePoints([item('a', '1880-12-31', null)], [])
    expect(built.startYearInt).toBe(1880)
    expect(built.startYear).toBeLessThan(1881)
    expect(built.startYear).toBeGreaterThanOrEqual(1880)
  })
})

describe('continuingIntoCenturyCount — 이전 세기부터 계속(검토 R9)', () => {
  it('세기 시작 전에 시작해 세기 안까지 이어진 사건만 센다', () => {
    const points = [
      point('war', 1795, 1815), // 18세기 시작 → 19세기로 계속
      point('local', 1850, 1852), // 19세기 안에서 시작·종료
      point('done', 1701, 1750), // 18세기에서 끝남
      point('unknown', null, null), // 미상 — 제외
    ]
    expect(continuingIntoCenturyCount(points, 19)).toBe(1)
    expect(continuingIntoCenturyCount(points, 18)).toBe(0)
  })
})

describe('세기·10년 구간 규약 (16세기 = 1501~1600)', () => {
  it('span10StartOf — 세기 경계에 정렬된 10등분', () => {
    expect(span10StartOf(1871)).toBe(1871)
    expect(span10StartOf(1880)).toBe(1871)
    expect(span10StartOf(1881)).toBe(1881)
    expect(span10StartOf(1900)).toBe(1891) // 1900은 19세기 마지막 구간
    expect(span10StartOf(1901)).toBe(1901)
  })

  it('span10StartOf — BC(-1세기 = -100..-1)', () => {
    expect(span10StartOf(-100)).toBe(-100)
    expect(span10StartOf(-91)).toBe(-100)
    expect(span10StartOf(-90)).toBe(-90)
    expect(span10StartOf(-1)).toBe(-10)
  })

  it('span10BucketsOf — 항상 10개, 시작 기준 배정', () => {
    const buckets = span10BucketsOf(
      [point('a', 1871), point('b', 1880), point('c', 1881), point('d', 1900)],
      19,
    )
    expect(buckets).toHaveLength(10)
    expect(buckets[0].startYear).toBe(1801)
    expect(buckets[9].startYear).toBe(1891)
    expect(buckets[7].count).toBe(2) // 1871–1880
    expect(buckets[8].count).toBe(1) // 1881–1890
    expect(buckets[9].count).toBe(1) // 1891–1900
  })

  it('yearBucketsOf — 10개 연도, 구간 밖은 제외', () => {
    const buckets = yearBucketsOf(
      [point('a', 1874), point('b', 1874), point('c', 1990)],
      1871,
    )
    expect(buckets).toHaveLength(10)
    expect(buckets[3].year).toBe(1874)
    expect(buckets[3].count).toBe(2)
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(2)
  })

  it('formatSpan10Label — AD/BC', () => {
    expect(formatSpan10Label(1871)).toBe('1871–1880년')
    expect(formatSpan10Label(-100)).toBe('기원전 100–91년')
  })
})

describe('centuryOverview / centuryGapCount', () => {
  it('시작 사건이 있는 세기만 연대순으로, 미상은 별도 카운트', () => {
    const { buckets, unknownCount } = centuryOverview([
      point('a', 1950),
      point('b', -44),
      point('c', null, null),
    ])
    expect(buckets.map((bucket) => bucket.century)).toEqual([-1, 20])
    expect(unknownCount).toBe(1)
  })

  it('빈 세기 수 — 0세기는 세지 않는다', () => {
    expect(centuryGapCount(17, 19)).toBe(1)
    expect(centuryGapCount(17, 18)).toBe(0)
    expect(centuryGapCount(-1, 1)).toBe(0) // 0세기 없음 → 인접
    expect(centuryGapCount(-2, 2)).toBe(2) // -1, 1세기만 비었다
  })
})

describe('창(window)', () => {
  it('windowYearRange — 세기·10년 구간·전체·미상', () => {
    expect(windowYearRange({ level: 'century', century: 19 })).toEqual({
      fromYear: 1801,
      toYear: 1901,
    })
    expect(windowYearRange({ level: 'century', century: -1 })).toEqual({
      fromYear: -100,
      toYear: 0,
    })
    expect(windowYearRange({ level: 'span10', startYear: 1871 })).toEqual({
      fromYear: 1871,
      toYear: 1881,
    })
    expect(windowYearRange(null)).toBeNull()
    expect(windowYearRange({ level: 'unknown' })).toBeNull()
  })

  it('pointsStartingInWindow — 소속은 시작 기준, 미상 창은 미상만', () => {
    const points = [
      point('a', 1875, 1920), // 창(19세기) 안 시작, 다음 세기까지 지속
      point('b', 1799, 1815), // 이전 세기 시작 — 리스트에서는 제외
      point('c', null, null),
    ]
    const inCentury = pointsStartingInWindow(points, {
      level: 'century',
      century: 19,
    })
    expect(inCentury.map((entry) => entry.id)).toEqual(['a'])
    expect(
      pointsStartingInWindow(points, { level: 'unknown' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['c'])
    // 전체 = 일자 있는 전부
    expect(pointsStartingInWindow(points, null).map((entry) => entry.id)).toEqual(
      ['a', 'b'],
    )
  })

  it('windowContainsPoint / windowContainingPoint 왕복', () => {
    const dated = point('a', 1874)
    const target = windowContainingPoint(dated)
    expect(target).toEqual({ level: 'span10', startYear: 1871 })
    expect(windowContainsPoint(target, dated)).toBe(true)
    expect(windowContainsPoint(null, dated)).toBe(true)
    const undated = point('u', null, null)
    expect(windowContainsPoint(null, undated)).toBe(false)
    expect(windowContainingPoint(undated)).toEqual({ level: 'unknown' })
  })

  it('parentWindow — span10 → 세기 → 전체, 미상 → 전체', () => {
    expect(parentWindow({ level: 'span10', startYear: 1871 })).toEqual({
      level: 'century',
      century: 19,
    })
    expect(parentWindow({ level: 'span10', startYear: -100 })).toEqual({
      level: 'century',
      century: -1,
    })
    expect(parentWindow({ level: 'century', century: 19 })).toBeNull()
    expect(parentWindow({ level: 'unknown' })).toBeNull()
    expect(parentWindow(null)).toBeNull()
  })
})

describe('groupPointsForList', () => {
  it('전체 → 세기 그룹(빈 그룹 없음, 연대순)', () => {
    const groups = groupPointsForList(
      [point('a', 1950), point('b', -44), point('c', 1955)],
      null,
    )
    expect(groups.map((group) => group.key)).toEqual(['c-1', 'c20'])
    expect(groups[0].label).toBe('기원전 1세기')
  })

  it('세기 → 10년 구간 그룹, 그룹 안은 시간·중요도 순', () => {
    const groups = groupPointsForList(
      [
        point('normal', 1874),
        point('critical', 1874, 1874, { importance: 'critical' }),
        point('later', 1889),
      ],
      { level: 'century', century: 19 },
    )
    expect(groups.map((group) => group.label)).toEqual([
      '1871–1880년',
      '1881–1890년',
    ])
    expect(groups[0].points.map((entry) => entry.id)).toEqual([
      'critical',
      'normal',
    ])
  })
})

describe('트리 문맥 복원(W2) — 부모 제목 해석', () => {
  it('① 부모 행이 items에 있으면 그 제목을 쓴다(parentEvent보다 우선)', () => {
    const built = buildTimelinePoints(
      [
        item('parent', '1870-01-01', null, { title: '보불전쟁' }),
        item('child', '1870-09-01', null, {
          depth: 1,
          parentNodeId: 'parent',
          // parentEvent가 다른 것을 가리켜도 items 맵이 이긴다.
          parentEvent: { id: 'stale', title: '엉뚱한 제목' },
        }),
      ],
      [],
    )
    const child = built.find((entry) => entry.id === 'child')
    expect(child?.parentId).toBe('parent')
    expect(child?.parentTitle).toBe('보불전쟁')
  })

  it('② 부모가 배열에 없으면 id가 일치하는 parentEvent만 신뢰한다', () => {
    const [matched] = buildTimelinePoints(
      [
        item('child', '1870-09-01', null, {
          depth: 1,
          parentNodeId: 'parent',
          parentEvent: { id: 'parent', title: '보불전쟁' },
        }),
      ],
      [],
    )
    expect(matched.parentId).toBe('parent')
    expect(matched.parentTitle).toBe('보불전쟁')
  })

  it('③ parentEvent id 불일치(조부모 폴백 가능성)면 제목을 신뢰하지 않는다 → null', () => {
    const [built] = buildTimelinePoints(
      [
        item('grandchild', '1870-09-01', null, {
          depth: 2,
          parentNodeId: 'parent',
          parentEvent: { id: 'grandparent', title: '조부모 사건' },
        }),
      ],
      [],
    )
    expect(built.parentId).toBe('parent')
    expect(built.parentTitle).toBeNull()
  })

  it('parentNodeId가 없으면 트리 문맥 없음(parentId·parentTitle null)', () => {
    const [built] = buildTimelinePoints([item('a', '1870-01-01')], [])
    expect(built.parentId).toBeNull()
    expect(built.parentTitle).toBeNull()
  })
})

describe('트리 문맥 복원(W2) — 그룹 내 인접 복원', () => {
  const CENTURY_19 = { level: 'century', century: 19 } as const

  it('같은 그룹의 자식은 정렬을 이기고 부모 바로 뒤에 붙는다', () => {
    const groups = groupPointsForList(
      [
        point('other', 1871),
        point('parent', 1875),
        // 자식이 부모보다 이른 연도 — 연도 정렬대로면 부모 앞에 온다.
        point('child', 1872, 1872, { depth: 1, parentId: 'parent' }),
      ],
      CENTURY_19,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].points.map((entry) => entry.id)).toEqual([
      'other',
      'parent',
      'child',
    ])
  })

  it('다층 체인(부모→자식→손자)이 한 그룹에서 사슬 순서로 나온다', () => {
    const groups = groupPointsForList(
      [
        point('grandchild', 1871, 1871, { depth: 2, parentId: 'child' }),
        point('child', 1873, 1873, { depth: 1, parentId: 'parent' }),
        point('parent', 1875),
      ],
      CENTURY_19,
    )
    expect(groups[0].points.map((entry) => entry.id)).toEqual([
      'parent',
      'child',
      'grandchild',
    ])
  })

  it('형제 간에는 기존 compareForList 순서를 유지한다(안정적)', () => {
    const groups = groupPointsForList(
      [
        point('parent', 1875),
        point('siblingLate', 1873, 1873, { depth: 1, parentId: 'parent' }),
        point('siblingEarly', 1872, 1872, { depth: 1, parentId: 'parent' }),
      ],
      CENTURY_19,
    )
    expect(groups[0].points.map((entry) => entry.id)).toEqual([
      'parent',
      'siblingEarly',
      'siblingLate',
    ])
  })

  it('재배치는 그룹 소속·카운트를 절대 바꾸지 않는다 — 다른 그룹의 자식은 이동 없이 parentTitle을 가진다', () => {
    // 파이프라인 통합: build → group. 부모(1875)와 자식(1885)은 10년 구간이 다르다.
    const points = buildTimelinePoints(
      [
        item('parent', '1875-01-01', null, { title: '대전쟁' }),
        item('childFar', '1885-01-01', null, {
          depth: 1,
          parentNodeId: 'parent',
        }),
        item('childNear', '1876-01-01', null, {
          depth: 1,
          parentNodeId: 'parent',
        }),
      ],
      [],
    )
    const groups = groupPointsForList(points, CENTURY_19)
    // 소속은 시작 연도 기준 그대로 — 자식이 부모 그룹으로 끌려오지 않는다.
    expect(
      groups.map((group) => ({
        key: group.key,
        ids: group.points.map((entry) => entry.id).sort(),
        count: group.points.length,
      })),
    ).toEqual([
      { key: 'd1871', ids: ['childNear', 'parent'], count: 2 },
      { key: 'd1881', ids: ['childFar'], count: 1 },
    ])
    // 같은 그룹 자식은 부모 뒤(인접 복원), 다른 그룹 자식은 부모 제목을 안다.
    expect(groups[0].points.map((entry) => entry.id)).toEqual([
      'parent',
      'childNear',
    ])
    const childFar = groups[1].points[0]
    expect(childFar.parentId).toBe('parent')
    expect(childFar.parentTitle).toBe('대전쟁')
  })
})

describe('packSpanRows', () => {
  const WIDTH = 1000

  it('겹침 기준 + 경계 클램프 + 잘림 표식', () => {
    const { spans: packed } = packSpanRows(
      [point('war', 1795, 1815, { startYear: 1795, endYear: 1815.5 })],
      { level: 'century', century: 19 },
      WIDTH,
    )
    expect(packed).toHaveLength(1)
    expect(packed[0].x).toBe(0)
    expect(packed[0].clippedStart).toBe(true)
    expect(packed[0].clippedEnd).toBe(false)
    expect(packed[0].labelText).toContain('1795')
  })

  it('모든 스팬은 행을 배정받고(탈락 없음), 같은 행 점유 구간은 겹치지 않는다', () => {
    const points = Array.from({ length: 12 }, (_, index) =>
      point(`p${index}`, 1820 + index, 1860 + index, {
        startYear: 1820 + index,
        endYear: 1860 + index,
      }),
    )
    const { spans: packed, overflow } = packSpanRows(
      points,
      { level: 'century', century: 19 },
      WIDTH,
    )
    expect(packed).toHaveLength(12)
    expect(overflow).toHaveLength(0)
    const byRow = new Map<number, Array<{ start: number; end: number }>>()
    for (const span of packed) {
      const occupied = {
        start: Math.min(span.x, span.labelX),
        end: Math.max(span.x + span.width, span.labelX + span.labelWidth),
      }
      const rowSpans = byRow.get(span.row) ?? []
      for (const existing of rowSpans) {
        const overlaps =
          occupied.start < existing.end && existing.start < occupied.end
        expect(overlaps).toBe(false)
      }
      rowSpans.push(occupied)
      byRow.set(span.row, rowSpans)
    }
  })

  it('막대 폭이 임계 미만인 시점 사건은 밴드에 넣지 않는다(리스트 담당)', () => {
    const { spans: packed, overflow } = packSpanRows(
      [point('moment', 1874, 1874, { startYear: 1874.2, endYear: 1874.21 })],
      { level: 'century', century: 19 },
      WIDTH,
    )
    expect(packed).toHaveLength(0)
    // 임계 미만은 '접힘(overflow)'이 아니라 애초에 밴드 후보가 아니다.
    expect(overflow).toHaveLength(0)
  })

  it('창 우측 끝 스팬의 라벨은 왼쪽으로 폴백한다(항상 노출)', () => {
    const { spans: packed } = packSpanRows(
      [point('late', 1895, 1900, { startYear: 1895, endYear: 1900.9 })],
      { level: 'century', century: 19 },
      WIDTH,
    )
    expect(packed).toHaveLength(1)
    expect(packed[0].labelSide).toBe('left')
    expect(packed[0].labelX).toBeGreaterThanOrEqual(0)
  })

  it('행 상한을 넘는 스팬은 조용히 사라지지 않고 overflow로 반환된다(검토 R6)', () => {
    // 전부 같은 구간에 겹치는 스팬 5개 + 상한 2행 → 2행에 들어간 만큼만 그리고
    // 나머지는 overflow(연표 리스트 + «외 N건» 집계 라인이 담당).
    const points = Array.from({ length: 5 }, (_, index) =>
      point(`p${index}`, 1820, 1880, { startYear: 1820, endYear: 1880 }),
    )
    const { spans, overflow } = packSpanRows(
      points,
      { level: 'century', century: 19 },
      WIDTH,
      2,
    )
    expect(spans.length + overflow.length).toBe(5)
    expect(Math.max(...spans.map((span) => span.row))).toBeLessThanOrEqual(1)
    expect(overflow.length).toBeGreaterThan(0)
  })
})

describe('URL 직렬화 (tlw)', () => {
  it('왕복 — 세기·구간·미상·전체', () => {
    const windows = [
      { level: 'century', century: 19 } as const,
      { level: 'century', century: -1 } as const,
      { level: 'span10', startYear: 1871 } as const,
      { level: 'span10', startYear: -100 } as const,
      { level: 'unknown' } as const,
      null,
    ]
    for (const value of windows) {
      expect(parseTimelineWindow(serializeTimelineWindow(value))).toEqual(value)
    }
  })

  it('무효값은 전체(null)로 낙하', () => {
    expect(parseTimelineWindow('c0')).toBeNull()
    expect(parseTimelineWindow('d1870')).toBeNull() // 세기 10등분에 미정렬(19세기는 1871 시작)
    expect(parseTimelineWindow('d0')).toBeNull()
    expect(parseTimelineWindow('x99')).toBeNull()
    expect(parseTimelineWindow('')).toBeNull()
    expect(parseTimelineWindow(null)).toBeNull()
  })

  it('세기 크기 상한(|c| ≤ 21) 밖은 수용하지 않는다(검토 R5)', () => {
    // 수용하면 serialize가 같은 토큰을 되써 '첫 write에서 URL 정리'가 영원히 안 걸린다.
    expect(parseTimelineWindow('c999')).toBeNull()
    expect(parseTimelineWindow('c22')).toBeNull()
    expect(parseTimelineWindow('c-22')).toBeNull()
    expect(parseTimelineWindow('c21')).toEqual({ level: 'century', century: 21 })
    expect(parseTimelineWindow('c-21')).toEqual({
      level: 'century',
      century: -21,
    })
    // span10도 같은 상한 — 22세기 첫 구간(2101)은 기각, 21세기 마지막 구간(2091)은 수용.
    expect(parseTimelineWindow('d2101')).toBeNull()
    expect(parseTimelineWindow('d2091')).toEqual({
      level: 'span10',
      startYear: 2091,
    })
  })

  it('describeWindow 라벨', () => {
    expect(describeWindow(null)).toBe('전체')
    expect(describeWindow({ level: 'century', century: -1 })).toBe('기원전 1세기')
    expect(describeWindow({ level: 'span10', startYear: 1871 })).toBe(
      '1871–1880년',
    )
    expect(describeWindow({ level: 'unknown' })).toBe('연도 미상')
  })
})
