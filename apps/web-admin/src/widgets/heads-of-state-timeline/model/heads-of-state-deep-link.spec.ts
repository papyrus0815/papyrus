/**
 * 수장비교 딥링크 계약 테스트 — 두 반쪽을 못 박는다:
 *
 *  1. 생산자: pathKeys.headsOfState(year, {range, pins})가 만드는 URL을
 *     목적지의 *진짜* 파서(url-pins.ts의 parseYearParam/parseRangeParam/parsePinsParam —
 *     use-heads-of-state-timeline-state가 그대로 위임)로 되읽어 왕복을 검증한다.
 *     파서 문법이 바뀌면 이 테스트가 즉시 깨진다 (사본 regex 재서술 금지).
 *  2. 소비자: mergeUrlPinRows — 보드가 비어있으면 교체, 있으면 dedup 병합-추가
 *     (기존 「보드 있으면 URL 핀 통째 무시」의 수리 — 인물 상세 딥링크의 전제).
 */
import { pathKeys } from '@/shared/router'
import {
  mergeUrlPinRows,
  parsePinsParam,
  parseRangeParam,
  parseYearParam,
} from '@/widgets/heads-of-state-timeline/model/url-pins'
import type {
  PinnedRow,
  PinnedSegment,
} from '@/widgets/heads-of-state-timeline/model/types'

function searchParamsOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split('?')[1] ?? '')
}

function segment(partial: Partial<PinnedSegment> & Pick<PinnedSegment, 'kind' | 'countryId'>): PinnedSegment {
  return {
    segmentId: `seg-${partial.kind}-${partial.countryId}`,
    name: partial.name ?? partial.countryId,
    flagEmoji: null,
    lifespanStartYear: null,
    lifespanEndYear: null,
    ...partial,
  }
}

function row(rowId: string, segments: PinnedSegment[]): PinnedRow {
  return { rowId, segments }
}

describe('pathKeys.headsOfState ↔ 목적지 파서 왕복', () => {
  it('기존 호출부(사건 상세)와 소스 호환: 연도만 주면 ?year=N', () => {
    expect(pathKeys.headsOfState(1592)).toBe('/heads-of-state/?year=1592')
    expect(pathKeys.headsOfState()).toBe('/heads-of-state/')
  })

  it('year·range·pins가 진짜 파서로 왕복된다', () => {
    const url = pathKeys.headsOfState(1434, {
      range: { startYear: 1410, endYear: 1458 },
      pins: [
        { kind: 'H', id: 'joseon-id' },
        { kind: 'C', id: 'kr-id' },
      ],
    })
    const params = searchParamsOf(url)

    expect(parseYearParam(params.get('year'))).toBe(1434)
    expect(parseRangeParam(params.get('range'))).toEqual({
      startYear: 1410,
      endYear: 1458,
    })
    expect(parsePinsParam(params.get('pins'))).toEqual([
      ['H:joseon-id'],
      ['C:kr-id'],
    ])
  })

  it('BC(음수) 연도·범위도 왕복된다 (~ 구분자)', () => {
    const url = pathKeys.headsOfState(-228, {
      range: { startYear: -255, endYear: -202 },
    })
    const params = searchParamsOf(url)
    expect(parseYearParam(params.get('year'))).toBe(-228)
    expect(parseRangeParam(params.get('range'))).toEqual({
      startYear: -255,
      endYear: -202,
    })
  })

  it('BC→AD에 걸친 범위(시작만 음수)도 왕복된다', () => {
    const url = pathKeys.headsOfState(1, {
      range: { startYear: -18, endYear: 30 },
    })
    expect(parseRangeParam(searchParamsOf(url).get('range'))).toEqual({
      startYear: -18,
      endYear: 30,
    })
  })

  it('빈 pins 배열은 파라미터 자체를 생략한다', () => {
    const url = pathKeys.headsOfState(1508, { pins: [] })
    expect(searchParamsOf(url).has('pins')).toBe(false)
  })

  it('파서는 무효 입력을 거부한다 (endYear <= startYear, 형식 오류)', () => {
    expect(parseRangeParam('1500-1500')).toBeNull()
    expect(parseRangeParam('가나다')).toBeNull()
    expect(parseRangeParam(null)).toBeNull()
    expect(parseYearParam('abc')).toBeNull()
    expect(parsePinsParam(null)).toBeNull()
  })
})

describe('mergeUrlPinRows — URL 핀 적용 규칙', () => {
  const savedBoard = [
    row('r1', [segment({ kind: 'COUNTRY', countryId: 'kr' })]),
    row('r2', [segment({ kind: 'HISTORICAL', countryId: 'ming' })]),
  ]

  it('보드가 비어있으면 URL 행으로 교체', () => {
    const urlRows = [row('u1', [segment({ kind: 'HISTORICAL', countryId: 'joseon' })])]
    expect(mergeUrlPinRows([], urlRows)).toEqual(urlRows)
  })

  it('보드가 있으면 무시하지 않고 병합-추가 (기존 행 보존 + URL 행 append)', () => {
    const urlRows = [row('u1', [segment({ kind: 'HISTORICAL', countryId: 'joseon' })])]
    const merged = mergeUrlPinRows(savedBoard, urlRows)!
    expect(merged).toHaveLength(3)
    expect(merged.slice(0, 2)).toEqual(savedBoard)
    expect(merged[2]!.segments[0]!.countryId).toBe('joseon')
  })

  it('이미 핀된 kind+countryId는 dedup — 전부 중복이면 null(no-op)', () => {
    const urlRows = [row('u1', [segment({ kind: 'COUNTRY', countryId: 'kr' })])]
    expect(mergeUrlPinRows(savedBoard, urlRows)).toBeNull()
  })

  it('같은 id라도 kind가 다르면 별개 국가로 취급해 추가', () => {
    const urlRows = [row('u1', [segment({ kind: 'HISTORICAL', countryId: 'kr' })])]
    const merged = mergeUrlPinRows(savedBoard, urlRows)!
    expect(merged).toHaveLength(3)
  })

  it('다중 segment 행은 중복 segment만 걸러내고 나머지를 유지', () => {
    const urlRows = [
      row('u1', [
        segment({ kind: 'HISTORICAL', countryId: 'ming' }), // 이미 핀됨
        segment({ kind: 'HISTORICAL', countryId: 'qing' }),
      ]),
    ]
    const merged = mergeUrlPinRows(savedBoard, urlRows)!
    expect(merged).toHaveLength(3)
    expect(merged[2]!.segments.map((seg) => seg.countryId)).toEqual(['qing'])
  })

  it('transient 플래그(세션 한정·localStorage 미저장)는 병합을 통과해 보존된다', () => {
    const urlRows = [
      {
        ...row('u1', [segment({ kind: 'HISTORICAL', countryId: 'joseon' })]),
        transient: true,
      },
    ]
    expect(mergeUrlPinRows([], urlRows)![0]!.transient).toBe(true)
    expect(mergeUrlPinRows(savedBoard, urlRows)![2]!.transient).toBe(true)
  })

  it('URL 행이 없으면 null(no-op)', () => {
    expect(mergeUrlPinRows(savedBoard, [])).toBeNull()
  })
})
