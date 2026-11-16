import { effectiveSignedRange, pickModernLinkPeriod } from './modern-link-period'

const roc = { startEra: 'AD' as const, startYear: 1912, startMonth: 1, endEra: null, endYear: null, endMonth: null }

describe('modern-link-period', () => {
  it('연결 기간이 없으면 존속 기간', () => {
    expect(effectiveSignedRange(roc)).toEqual({ start: 1912, end: null })
  })

  it('중국 쪽: 연결 끝(1949)이 종료가 된다', () => {
    const item = { ...roc, ...pickModernLinkPeriod({ startEra: 'AD', startYear: 1912, startMonth: 1, endEra: 'AD', endYear: 1949, endMonth: 12 }) }
    expect(effectiveSignedRange(item)).toEqual({ start: 1912, end: 1949 })
  })

  it('대만 쪽: 시작만 1945, 끝은 존속 기간(진행 중)', () => {
    const item = { ...roc, ...pickModernLinkPeriod({ startEra: 'AD', startYear: 1945, startMonth: 10 }) }
    expect(effectiveSignedRange(item)).toEqual({ start: 1945, end: null })
  })

  it('BC 연결 기간은 음수', () => {
    const item = { ...roc, startEra: 'BC' as const, startYear: 300, ...pickModernLinkPeriod({ startEra: 'BC', startYear: 200 }) }
    expect(effectiveSignedRange(item).start).toBe(-200)
  })

  it('칸이 없는 옛 행도 null로 채운다', () => {
    expect(pickModernLinkPeriod({})).toEqual({
      linkStartEra: null, linkStartYear: null, linkStartMonth: null,
      linkEndEra: null, linkEndYear: null, linkEndMonth: null,
    })
  })
})
