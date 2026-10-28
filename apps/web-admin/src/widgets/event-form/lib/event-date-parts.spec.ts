import { daysInMonth, partsFromIso, partsToIso, shouldEndFollowStart } from './event-date-parts'

const partial = { allowPartial: true }

describe('partsToIso — 채운 칸이 정밀도를 정한다', () => {
  it('연도만 → year, 월·일은 01로 채운다', () => {
    expect(partsToIso({ era: 'AD', year: '1950', month: '', day: '' }, partial)).toEqual({
      kind: 'ok',
      iso: '1950-01-01',
      precision: 'year',
    })
  })

  it('연·월 → month', () => {
    expect(partsToIso({ era: 'AD', year: '1950', month: '6', day: '' }, partial)).toEqual({
      kind: 'ok',
      iso: '1950-06-01',
      precision: 'month',
    })
  })

  it('연·월·일 → day, 기원전은 앞에 -', () => {
    expect(partsToIso({ era: 'BC', year: '44', month: '3', day: '15' }, partial)).toEqual({
      kind: 'ok',
      iso: '-0044-03-15',
      precision: 'day',
    })
  })

  it('모두 비면 empty', () => {
    expect(partsToIso({ era: 'BC', year: '', month: '', day: '' }, partial)).toEqual({ kind: 'empty' })
  })
})

describe('partsToIso — 달력이 막아 주던 잘못된 날짜를 잡는다', () => {
  const errorOf = (parts: Parameters<typeof partsToIso>[0], allowPartial = true) => {
    const result = partsToIso(parts, { allowPartial })
    return result.kind === 'error' ? result.message : null
  }

  it('2월 30일', () => {
    expect(errorOf({ era: 'AD', year: '2023', month: '2', day: '30' })).toMatch('2월은 28일까지')
  })

  it('윤년 2월 29일은 통과, 평년은 오류', () => {
    expect(errorOf({ era: 'AD', year: '2024', month: '2', day: '29' })).toBeNull()
    expect(errorOf({ era: 'AD', year: '1900', month: '2', day: '29' })).not.toBeNull()
  })

  it('13월', () => {
    expect(errorOf({ era: 'AD', year: '1950', month: '13', day: '' })).toMatch('1부터 12')
  })

  it('0년은 없다', () => {
    expect(errorOf({ era: 'AD', year: '0', month: '', day: '' })).toMatch('0년은 없습니다')
  })

  it('연도 없이 월, 월 없이 일', () => {
    expect(errorOf({ era: 'AD', year: '', month: '6', day: '' })).toMatch('연도를 먼저')
    expect(errorOf({ era: 'AD', year: '1950', month: '', day: '3' })).toMatch('월도 입력')
  })

  it('정밀도를 저장할 수 없는 폼이면 일까지 다 쳐야 한다', () => {
    expect(errorOf({ era: 'AD', year: '1950', month: '6', day: '' }, false)).toMatch('모두 입력')
    expect(errorOf({ era: 'AD', year: '1950', month: '6', day: '25' }, false)).toBeNull()
  })
})

describe('partsFromIso — 정밀도 밖의 채움값은 비운다', () => {
  it("'1950-01-01' + year → 연도만", () => {
    expect(partsFromIso('1950-01-01', 'year')).toEqual({ era: 'AD', year: '1950', month: '', day: '' })
  })

  it('기원전 왕복', () => {
    const parts = partsFromIso('-0044-03-15', 'day')
    expect(parts).toEqual({ era: 'BC', year: '44', month: '3', day: '15' })
    expect(partsToIso(parts, partial)).toMatchObject({ iso: '-0044-03-15', precision: 'day' })
  })

  it('빈 값은 기원만 유지', () => {
    expect(partsFromIso('', 'day', 'BC')).toEqual({ era: 'BC', year: '', month: '', day: '' })
  })
})

it('daysInMonth — 기원전 1년은 천문학적 0년이라 윤년', () => {
  expect(daysInMonth('BC', 1, 2)).toBe(29)
  expect(daysInMonth('BC', 2, 2)).toBe(28)
})

describe('shouldEndFollowStart — 종료가 시작을 따라 채워지는 조건', () => {
  it('새 사건: 빈 시작을 처음 쓰고 종료도 비었으면 따라간다', () => {
    expect(shouldEndFollowStart(false, '', '')).toBe(true)
  })

  it('따라가는 중이면 시작을 계속 고쳐도 따라간다', () => {
    expect(shouldEndFollowStart(true, '1950-01-01', '1950-01-01')).toBe(true)
  })

  it('편집 중인 진행 중 사건(시작 있음·종료 없음)은 따라가지 않는다', () => {
    expect(shouldEndFollowStart(false, '1950-06-25', '')).toBe(false)
  })

  it('종료를 먼저 써 둔 경우 시작을 써도 덮지 않는다', () => {
    expect(shouldEndFollowStart(false, '', '1953-07-27')).toBe(false)
  })
})
