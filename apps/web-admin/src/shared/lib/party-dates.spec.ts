import {
  formatPartialDate,
  formatPeriodLabel,
  isPartyDissolved,
  isPeriodFormInverted,
  partialSignedYear,
  partialSortKey,
  partyFoundedOn,
  periodDateFormError,
  structuredInputOf,
} from './party-dates'

describe('정당 날짜', () => {
  it('구조화 칸이 진실 — 연 정밀은 1월 1일로 보이지 않는다', () => {
    const party = { foundedEra: 'AD', foundedYear: 1913, foundedDate: '1913-01-01T12:00:00.000Z' }
    expect(partyFoundedOn(party)).toBe('1913')
    expect(formatPartialDate(partyFoundedOn(party))).toBe('1913년')
  })

  it('기원전 — 거울 DATETIME이 없어도 날짜가 있다', () => {
    const party = { foundedEra: 'BC', foundedYear: 133, foundedDate: null }
    expect(formatPartialDate(partyFoundedOn(party))).toBe('기원전 133년')
    expect(partialSignedYear(partyFoundedOn(party))).toBe(-133)
  })

  it('구조화 칸이 없던 응답은 거울로', () => {
    expect(partyFoundedOn({ foundedDate: '1921-11-09T12:00:00.000Z' })).toBe('1921-11-09')
  })

  it('해산 여부 — 기원전 해산도 해산', () => {
    expect(isPartyDissolved({ dissolvedEra: 'BC', dissolvedYear: 27 })).toBe(true)
    expect(isPartyDissolved({})).toBe(false)
  })

  it('정렬 키 — 기원전이 앞', () => {
    expect(partialSortKey('-0133')! < partialSortKey('1921-11-09')!).toBe(true)
  })

  it('기간 라벨 — 지속 중·한쪽만', () => {
    expect(formatPeriodLabel({ startEra: 'AD', startYear: 1928, isCurrent: true })).toBe('1928년 ~ 현재')
    expect(formatPeriodLabel({ endEra: 'AD', endYear: 1943, endMonth: 7, endDay: 27 })).toBe('~ 1943년 7월 27일')
    expect(formatPeriodLabel({})).toBe('')
  })

  it('폼 값 → 서버 입력 · 검증 · 역전', () => {
    expect(structuredInputOf({ era: 'BC', year: 133, month: undefined, day: 5 })).toEqual({ era: 'BC', year: 133 })
    expect(structuredInputOf({ era: undefined, year: undefined, month: undefined, day: undefined })).toBeNull()
    expect(periodDateFormError({ era: 'AD', year: undefined, month: 3, day: undefined })).toBe('연도를 입력하세요.')
    expect(periodDateFormError({ era: 'AD', year: 1900, month: 2, day: 29 })).toBe('없는 날짜입니다.')
    expect(periodDateFormError({ era: 'AD', year: 2000, month: 2, day: 29 })).toBeNull()
    expect(
      isPeriodFormInverted(
        { era: 'AD', year: 1920, month: 3, day: 15 },
        { era: 'AD', year: 1920, month: undefined, day: undefined },
      ),
    ).toBe(false)
    expect(
      isPeriodFormInverted(
        { era: 'AD', year: 10, month: undefined, day: undefined },
        { era: 'BC', year: 10, month: undefined, day: undefined },
      ),
    ).toBe(true)
  })
})
