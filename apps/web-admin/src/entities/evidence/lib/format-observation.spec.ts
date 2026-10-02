import type { Observation } from '@/shared/api/evidence'

import {
  compactKoreanNumber,
  formatObservationExact,
  formatObservationValue,
  isUnverified,
  observationExtent,
} from './format-observation'

const metric = (overrides: Partial<Observation['metric']> = {}): Observation['metric'] => ({
  key: 'military.wounded',
  name: '군 부상자',
  domain: 'military',
  valueKind: 'COUNT',
  aggregation: 'SUM',
  unit: 'person',
  definition: null,
  ...overrides,
})

const observation = (overrides: Partial<Observation>): Observation => ({
  id: 'o',
  subjectType: 'EVENT_SIDE',
  subjectId: 's',
  metric: metric(),
  value: null,
  low: null,
  high: null,
  approx: false,
  atLeast: false,
  qualifier: null,
  currency: null,
  start: null,
  end: null,
  note: null,
  sortOrder: 0,
  citations: [],
  ...overrides,
})

describe('compactKoreanNumber', () => {
  it('만·억으로 읽는다', () => {
    expect(compactKoreanNumber('44700')).toBe('4.47만')
    expect(compactKoreanNumber('1200000')).toBe('120만')
    expect(compactKoreanNumber('637000')).toBe('63.7만')
    expect(compactKoreanNumber('450000000')).toBe('4.5억')
    expect(compactKoreanNumber('5750')).toBe('5,750')
  })
})

describe('formatObservationValue', () => {
  it('점 추정 + 약', () => {
    expect(formatObservationValue(observation({ value: '44700', approx: true }))).toBe('약 4.47만명')
  })
  it('범위', () => {
    expect(formatObservationValue(observation({ low: '18000', high: '20000', approx: true }))).toBe(
      '약 1.8만~2만명',
    )
  })
  it('이상', () => {
    expect(formatObservationValue(observation({ low: '1000', atLeast: true }))).toBe('1,000명 이상')
  })
  it('금액은 통화 이름', () => {
    expect(
      formatObservationValue(
        observation({
          value: '8000000',
          metric: metric({ valueKind: 'MONEY', unit: null }),
          currency: { code: 'GBP', name: '영국 파운드', symbol: '£' },
        }),
      ),
    ).toBe('800만 영국 파운드')
  })
  it('정확한 표기는 줄이지 않는다', () => {
    expect(formatObservationExact(observation({ value: '44700', approx: true }))).toBe('약 44,700명')
  })
})

describe('observationExtent', () => {
  it('범위만 있으면 가운데를 대표값으로', () => {
    expect(observationExtent(observation({ low: '700000', high: '900000' }))).toEqual({
      center: 800000,
      low: 700000,
      high: 900000,
      openEnded: false,
    })
  })
  it('값이 없으면 null', () => {
    expect(observationExtent(observation({}))).toBeNull()
  })
})

describe('isUnverified', () => {
  const source = (kind: Observation['citations'][number]['source']['kind']) => ({
    id: 'c',
    locator: null,
    quote: null,
    note: null,
    sortOrder: 0,
    source: {
      id: 's',
      kind,
      title: 't',
      authors: null,
      publisher: null,
      publishedYear: null,
      url: null,
      identifier: null,
      accessedOn: null,
      note: null,
    },
  })
  it('미검증 출처뿐이면 true', () => {
    expect(isUnverified(observation({ citations: [source('LEGACY_UNVERIFIED')] }))).toBe(true)
    expect(isUnverified(observation({ citations: [source('LEGACY_UNVERIFIED'), source('BOOK')] }))).toBe(false)
  })
})
