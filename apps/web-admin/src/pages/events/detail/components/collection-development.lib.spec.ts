import {
  groupByPhase,
  phaseOf,
  plainStepSummary,
  spanOfChildren,
  stepTimeMarkers,
} from './collection-development.lib'

const ww1 = { startDate: '1914-07-28', startDatePrecision: 'day', endDate: '1918-11-11', endDatePrecision: 'day' }

describe('phaseOf', () => {
  it('개전 전 7월 위기는 시작 이전', () => {
    expect(phaseOf({ startDate: '1914-06-28T00:00:00.000Z', startDatePrecision: 'day' }, ww1)).toBe('before')
  })

  it('상위 시작 전에 시작해 시작일까지 이어진 하위는 기간 중', () => {
    expect(
      phaseOf({ startDate: '1914-06-28', startDatePrecision: 'day', endDate: '1914-08-04', endDatePrecision: 'day' }, ww1),
    ).toBe('during')
    expect(
      phaseOf({ startDate: '1914-06-28', startDatePrecision: 'day', endDate: '1914-07-23', endDatePrecision: 'day' }, ww1),
    ).toBe('before')
  })

  it('기간 안은 기간 중, 시작 당일도 기간 중', () => {
    expect(phaseOf({ startDate: '1916-02-21', startDatePrecision: 'day' }, ww1)).toBe('during')
    expect(phaseOf({ startDate: '1914-07-28', startDatePrecision: 'day' }, ww1)).toBe('during')
  })

  it('종료 뒤는 끝난 뒤', () => {
    expect(phaseOf({ startDate: '1919-06-28', startDatePrecision: 'day' }, ww1)).toBe('after')
  })

  it('거친 정밀도에서 비교 — 연도만 아는 1700년은 1700-02-22 시작과 같은 해라 기간 중', () => {
    const northernWar = { startDate: '1700-02-22', startDatePrecision: 'day', endDate: '1721-09-10' }
    expect(phaseOf({ startDate: '1700-01-01', startDatePrecision: 'year' }, northernWar)).toBe('during')
    expect(phaseOf({ startDate: '1699-01-01', startDatePrecision: 'year' }, northernWar)).toBe('before')
  })

  it('월 정밀도 — 1914년 7월은 7.28 시작과 같은 달이라 기간 중', () => {
    expect(phaseOf({ startDate: '1914-07-01', startDatePrecision: 'month' }, ww1)).toBe('during')
  })

  it('BC 날짜도 부호 연도로 비교한다', () => {
    const war = { startDate: '-0431-01-01', startDatePrecision: 'year', endDate: '-0404-01-01', endDatePrecision: 'year' }
    expect(phaseOf({ startDate: '-0433-01-01', startDatePrecision: 'year' }, war)).toBe('before')
    expect(phaseOf({ startDate: '-0415-01-01', startDatePrecision: 'year' }, war)).toBe('during')
  })

  it('날짜 없는 하위는 날짜 미상, 상위 날짜가 없으면 전부 기간 중', () => {
    expect(phaseOf({}, ww1)).toBe('undated')
    expect(phaseOf({ startDate: '1900-01-01' }, {})).toBe('during')
  })
})

describe('groupByPhase', () => {
  it('구획 순서는 이전 → 중 → 뒤 → 미상, 빈 구획은 빠진다', () => {
    const groups = groupByPhase(
      [
        { id: 'a', startDate: '1914-06-28' },
        { id: 'b', startDate: '1914-08-04' },
        { id: 'c' },
      ],
      ww1,
    )
    expect(groups.map((group) => [group.phase, group.items.map((item) => item.id)])).toEqual([
      ['before', ['a']],
      ['during', ['b']],
      ['undated', ['c']],
    ])
  })
})

describe('spanOfChildren', () => {
  it('가장 이른 시작 ~ 가장 늦은 끝, 정밀도는 그 값을 낸 하위의 것', () => {
    expect(
      spanOfChildren([
        { startDate: '1914-07-28', startDatePrecision: 'day', endDate: '1914-08-04', endDatePrecision: 'day' },
        { startDate: '1914-06', startDatePrecision: 'month' },
        { startDate: '1914-08-06', startDatePrecision: 'day' },
      ]),
    ).toEqual({
      startDate: '1914-06',
      startDatePrecision: 'month',
      endDate: '1914-08-06',
      endDatePrecision: 'day',
    })
  })

  it('끝이 없는 하위는 시작이 끝을 대신하고, 날짜 없는 하위는 건너뛴다', () => {
    expect(
      spanOfChildren([{ startDate: null }, { startDate: '1700', startDatePrecision: 'year' }]),
    ).toEqual({ startDate: '1700', startDatePrecision: 'year', endDate: '1700', endDatePrecision: 'year' })
  })

  it('날짜 있는 하위가 없으면 null', () => {
    expect(spanOfChildren([{ startDate: null }, {}])).toBeNull()
  })
})

describe('stepTimeMarkers', () => {
  it('여러 해에 걸친 형제들은 해가 바뀌는 첫 행마다 연도 마커를 낸다', () => {
    const markers = stepTimeMarkers([
      { startDate: '1789-05-05', startDatePrecision: 'day' },
      { startDate: '1789-07-14', startDatePrecision: 'day' },
      { startDate: '1791-06-20', startDatePrecision: 'day' },
    ])
    expect(markers).toEqual(['1789년', null, '1791년'])
  })

  it('같은 해 안에서 여러 달에 걸치면 달이 바뀌는 첫 행마다 연·월 마커를 낸다', () => {
    const markers = stepTimeMarkers([
      { startDate: '1914-06-28', startDatePrecision: 'day' },
      { startDate: '1914-07-23', startDatePrecision: 'day' },
      { startDate: '1914-07-28', startDatePrecision: 'day' },
    ])
    expect(markers).toEqual(['1914년 6월', '1914년 7월', null])
  })

  it('모두 같은 해·같은 달이면 마커를 생략한다', () => {
    const markers = stepTimeMarkers([
      { startDate: '1914-07-23', startDatePrecision: 'day' },
      { startDate: '1914-07-28', startDatePrecision: 'day' },
    ])
    expect(markers).toEqual([null, null])
  })
})

describe('plainStepSummary', () => {
  it('HTML 태그·엔티티·마크다운 강조를 걷어 한 줄 요약 문자열로 만든다', () => {
    expect(plainStepSummary('<p><strong>바스티유</strong> 함락 &amp; 봉기</p>')).toBe('바스티유 함락 & 봉기')
    expect(plainStepSummary(null)).toBeNull()
    expect(plainStepSummary('   ')).toBeNull()
  })
})
