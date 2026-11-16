/**
 * 현대 국가 연결 기간 — 중화민국 실데이터(중국 1912.1–1949.12 / 대만 1945.10–)로 검증.
 */
import {
  compareByCountryStart,
  formatModernLinkPeriod,
  getCountryYearRange,
  hasModernLinkPeriod,
  toLinkScopedPeriod,
} from './country-period'

const roc = { startEra: 'AD', startYear: 1912, endEra: null, endYear: null }
const rocInChina = { ...roc, linkStartEra: 'AD', linkStartYear: 1912, linkStartMonth: 1, linkEndEra: 'AD', linkEndYear: 1949, linkEndMonth: 12 }
const rocInTaiwan = { ...roc, linkStartEra: 'AD', linkStartYear: 1945, linkStartMonth: 10, linkEndEra: null, linkEndYear: null, linkEndMonth: null }
const prc = { startEra: 'AD', startYear: 1949, endEra: null, endYear: null }

describe('연결 기간', () => {
  it('기간이 없는 연결은 존속 기간 그대로', () => {
    expect(hasModernLinkPeriod(prc)).toBe(false)
    expect(toLinkScopedPeriod(prc)).toBe(prc)
    expect(formatModernLinkPeriod(prc)).toBeNull()
  })

  it('중국 쪽 중화민국은 1949에서 끝난다 — 진행 중으로 보이지 않는다', () => {
    expect(getCountryYearRange(toLinkScopedPeriod(rocInChina))).toEqual({ start: 1912, end: 1949 })
    expect(formatModernLinkPeriod(rocInChina)).toBe('1912.1–1949.12')
  })

  it('대만 쪽 중화민국은 1945에 시작하고 끝은 존속 기간(진행 중)을 이어받는다', () => {
    expect(getCountryYearRange(toLinkScopedPeriod(rocInTaiwan))).toEqual({ start: 1945, end: null })
    expect(formatModernLinkPeriod(rocInTaiwan)).toBe('1945.10–')
  })

  it('정렬은 이 땅에 들어온 때 기준 — 대만 목록에서 중화민국은 1945 자리', () => {
    const japan = { startEra: 'AD', startYear: 1868, endEra: 'AD', endYear: 1947 }
    const sorted = [rocInTaiwan, japan].sort((left, right) =>
      compareByCountryStart(toLinkScopedPeriod(left), toLinkScopedPeriod(right)),
    )
    expect(sorted[0]).toBe(japan)
  })

  it('원본 객체를 바꾸지 않는다', () => {
    toLinkScopedPeriod(rocInChina)
    expect(rocInChina.endYear).toBeNull()
  })
})
