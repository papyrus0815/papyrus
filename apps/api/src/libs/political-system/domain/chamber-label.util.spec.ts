import { splitChamberLabel } from './chamber-label.util'

describe('원 이름 이관 — 정체 글자 칸 나누기', () => {
  it('괄호 안 원어는 원어로', () => {
    expect(splitChamberLabel('서민원(House of Commons)')).toEqual({ name: '서민원', localName: 'House of Commons', startYear: null, endYear: null })
  })
  it('한국어 풀이는 버리고 원어만 남긴다', () => {
    expect(splitChamberLabel('서민원(하원)')).toMatchObject({ name: '서민원', localName: null })
    expect(splitChamberLabel('제2원(하원, Tweede Kamer)')).toMatchObject({ name: '제2원', localName: 'Tweede Kamer' })
  })
  it('연도 범위는 존속으로', () => {
    expect(splitChamberLabel('자정원(1910~1912)')).toEqual({ name: '자정원', localName: null, startYear: 1910, endYear: 1912 })
  })
  it('괄호 없으면 그대로', () => {
    expect(splitChamberLabel('제헌국회 · 민의원')).toMatchObject({ name: '제헌국회 · 민의원', localName: null })
  })
})
