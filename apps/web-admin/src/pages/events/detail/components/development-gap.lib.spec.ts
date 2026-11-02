import { gapText, siblingGaps, spanText } from './development-gap.lib'

const day = (startDate: string, endDate?: string) => ({
  startDate,
  startDatePrecision: 'day',
  endDate: endDate ?? null,
  endDatePrecision: endDate ? 'day' : null,
})

describe('spanText', () => {
  it('60일 미만은 그날까지 포함해 센다', () => {
    expect(spanText(day('1914-07-23', '1914-07-25'))).toBe('3일간')
    expect(spanText(day('1914-06-28', '1914-07-25'))).toBe('28일간')
  })
  it('하루짜리·끝 없음은 비운다', () => {
    expect(spanText(day('1914-07-28', '1914-07-28'))).toBeNull()
    expect(spanText(day('1914-07-28'))).toBeNull()
  })
  it('긴 사건은 장부와 같은 셈법', () => {
    expect(spanText(day('1914-07-28', '1918-11-11'))).toBe('4년 3개월 14일')
  })
  it('정밀도가 거칠면 거칠게', () => {
    expect(
      spanText({ startDate: '1700-01-01', startDatePrecision: 'year', endDate: '1721-01-01', endDatePrecision: 'year' }),
    ).toBe('약 22년')
    expect(
      spanText({ startDate: '1914-07-01', startDatePrecision: 'month', endDate: '1914-09-01', endDatePrecision: 'month' }),
    ).toBe('약 3개월')
  })
  it('정밀도 NULL인 1월 1일은 연도만 안다', () => {
    expect(spanText({ startDate: '1853-01-01', endDate: '1856-01-01' })).toBe('약 4년')
  })
})

describe('gapText', () => {
  it('앞 사건 시작부터 센다', () => {
    expect(gapText(day('1914-07-14', '1914-07-22'), day('1914-07-23'))?.text).toBe('+9일')
    expect(gapText(day('1914-07-25'), day('1914-07-25'))?.text).toBe('같은 날')
  })
  it('앞 사건이 아직 진행 중이면 표시한다', () => {
    const gap = gapText(day('1914-06-28', '1914-07-25'), day('1914-07-01', '1914-07-06'))
    expect(gap).toMatchObject({ text: '+3일', ongoing: true })
    expect(gap?.title).toBe('앞 사건 시작 3일 뒤 — 앞 사건이 아직 진행 중')
  })
  it('같은 날 끝난 앞 사건은 진행 중이 아니다', () => {
    expect(gapText(day('1914-07-23', '1914-07-25'), day('1914-07-25'))?.ongoing).toBe(false)
  })
  it('60일 이상은 개월·년으로', () => {
    expect(gapText(day('1914-07-28'), day('1914-11-02'))?.text).toBe('+3개월')
    expect(gapText(day('1914-07-28'), day('1915-09-30'))?.text).toBe('+1년 2개월')
    expect(gapText(day('1853-10-16'), day('1909-01-01'))?.text).toBe('+55년')
  })
  it('거친 정밀도는 약으로, 연 단위 같은 해는 생략', () => {
    expect(gapText({ startDate: '1914-07-01', startDatePrecision: 'month' }, day('1914-10-05'))?.text).toBe('+약 3개월')
    expect(gapText({ startDate: '1700-01-01', startDatePrecision: 'year' }, day('1700-02-22'))).toBeNull()
  })
  it('BC 날짜도 센다', () => {
    expect(gapText(day('-0044-03-15'), day('-0044-03-20'))?.text).toBe('+5일')
  })
})

describe('siblingGaps', () => {
  it('화면 차례가 날짜순이 아니면 가장 늦게 시작한 앞 형제와 견주고, 거꾸로 된 행은 비운다', () => {
    const gaps = siblingGaps([
      day('1914-07-24'),
      day('1914-07-25'),
      day('1914-07-07', '1914-07-28'),
      day('1914-07-28'),
    ])
    expect(gaps.map((gap) => gap?.text ?? null)).toEqual([null, '+1일', null, '+3일'])
  })
})
