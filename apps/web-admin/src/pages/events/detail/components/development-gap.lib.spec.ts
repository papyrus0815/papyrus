import { gapText, quietSpans, quietSpansWithStart, siblingGaps, spanText, trailingQuiet } from './development-gap.lib'

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
    expect(gapText(day('1914-07-14', '1914-07-22'), day('1914-07-23'))?.text).toBe('9일 뒤')
    expect(gapText(day('1914-07-25'), day('1914-07-25'))?.text).toBe('같은 날')
  })
  it('앞 사건이 아직 진행 중이면 표시한다', () => {
    const gap = gapText(day('1914-06-28', '1914-07-25'), day('1914-07-01', '1914-07-06'))
    expect(gap).toMatchObject({ text: '3일 뒤', ongoing: true })
    expect(gap?.title).toBe('앞 사건 시작 3일 뒤 (그 사건이 아직 진행 중)')
  })
  it('같은 날 끝난 앞 사건은 진행 중이 아니다', () => {
    expect(gapText(day('1914-07-23', '1914-07-25'), day('1914-07-25'))?.ongoing).toBe(false)
  })
  it('60일 이상은 개월·년으로', () => {
    expect(gapText(day('1914-07-28'), day('1914-11-02'))?.text).toBe('3개월 뒤')
    expect(gapText(day('1914-07-28'), day('1915-09-30'))?.text).toBe('1년 2개월 뒤')
    expect(gapText(day('1853-10-16'), day('1909-01-01'))?.text).toBe('55년 뒤')
  })
  it('거친 정밀도는 약으로, 연 단위 같은 해는 생략', () => {
    expect(gapText({ startDate: '1914-07-01', startDatePrecision: 'month' }, day('1914-10-05'))?.text).toBe('약 3개월 뒤')
    expect(gapText({ startDate: '1700-01-01', startDatePrecision: 'year' }, day('1700-02-22'))).toBeNull()
  })
  it('BC 날짜도 센다', () => {
    expect(gapText(day('-0044-03-15'), day('-0044-03-20'))?.text).toBe('5일 뒤')
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
    expect(gaps.map((gap) => gap?.text ?? null)).toEqual([null, '1일 뒤', null, '3일 뒤'])
  })
})

describe('quietSpans', () => {
  it('앞 사건들이 모두 끝난 뒤 1년 넘게 비면 공백', () => {
    expect(quietSpans([day('1600-12-31'), day('1612-09-01'), day('1639-08-22')])).toEqual([null, '11년 공백', '26년 공백'])
  })
  it('앞 사건이 길게 이어졌으면 시작 간격이 커도 공백이 아니다', () => {
    expect(quietSpans([day('1914-07-28', '1918-11-11'), day('1917-04-06')])).toEqual([null, null])
  })
  it('1년 미만은 비우고, 연 단위 끝은 그해 마지막 날로 본다', () => {
    expect(quietSpans([day('1914-07-28'), day('1915-03-01')])).toEqual([null, null])
    expect(
      quietSpans([
        { startDate: '1700-01-01', startDatePrecision: 'year' },
        { startDate: '1701-01-01', startDatePrecision: 'year' },
        { startDate: '1705-01-01', startDatePrecision: 'year' },
      ]),
    ).toEqual([null, null, '약 3년 공백'])
  })
})

describe('기준 사건 이름과 남은 빈 시간', () => {
  it('간격 툴팁은 기준 사건을 이름으로 부른다', () => {
    const gaps = siblingGaps([
      { ...day('1914-07-14', '1914-07-22'), title: '콘라트 위장 휴가' },
      { ...day('1914-07-23'), title: '최후통첩' },
    ])
    expect(gaps[1]?.title).toBe("'콘라트 위장 휴가' 시작 9일 뒤")
  })
  it('하위가 끝난 뒤 상위 끝까지 1년 넘게 비면 그 길이', () => {
    const children = [day('1914-06-28'), day('1914-08-04', '1914-08-06')]
    expect(trailingQuiet(children, day('1914-07-28', '1918-11-11'))).toBe('4년')
    expect(trailingQuiet(children, day('1914-07-28', '1915-01-01'))).toBeNull()
    expect(trailingQuiet(children, day('1914-07-28'))).toBeNull()
  })
})

describe('간격의 기준 자리', () => {
  it('바로 위가 아닌 형제와 견주면 그 자리를 알려 준다', () => {
    const gaps = siblingGaps([day('1914-07-24'), day('1914-07-25'), day('1914-07-07', '1914-07-28'), day('1914-07-28')])
    expect(gaps[1]?.anchorIndex).toBe(0)
    expect(gaps[3]?.anchorIndex).toBe(1)
  })
})

describe('quietSpansWithStart', () => {
  it('공백이 시작된 시점(앞 사건이 끝난 날)을 함께 낸다', () => {
    const quiets = quietSpansWithStart([day('1690-08-24'), day('1746-09-04', '1763-02-10')])
    expect(quiets[1]).toEqual({ label: '56년 공백', fromKey: 16900824 })
  })

  it('상위 사건이 6개월~5년 규모면 3개월 이상 빈 구간도 공백으로 짚는다', () => {
    const parent = day('1950-06-25', '1953-07-27')
    const quiets = quietSpansWithStart([day('1950-09-15', '1950-09-28'), day('1951-04-22')], parent)
    expect(quiets[1]).toEqual({ label: '6개월 공백', fromKey: 19500928 })
  })
})

describe('gapText pace', () => {
  it('시간차에 따라 fast / medium / slow 보폭을 함께 낸다', () => {
    expect(gapText(day('1914-07-23'), day('1914-07-28'))?.pace).toBe('fast')
    expect(gapText(day('1914-07-28'), day('1914-11-02'))?.pace).toBe('medium')
    expect(gapText(day('1914-07-28'), day('1916-02-21'))?.pace).toBe('slow')
  })
})
