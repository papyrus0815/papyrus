import {
  byProximity,
  directionConflicts,
  inferDirection,
  particle,
  relationSentence,
  relativeStart,
  signedStartYear,
} from './related-picker.lib'

const sarajevo = { startDate: '1914-06-28T00:00:00.000Z', startDatePrecision: 'day' }
const ultimatum = { startDate: '1914-07-23T00:00:00.000Z', startDatePrecision: 'day' }
const annexation = { startDate: '1908-10-06T00:00:00.000Z', startDatePrecision: 'day' }
const yearOnly = { startDate: '1883-01-01T00:00:00.000Z', startDatePrecision: null }
const caesar = { startEra: 'BC', startYear: 44 }

describe('relativeStart', () => {
  it('날짜를 둘 다 알면 일·개월로, 앞은 앞으로', () => {
    expect(relativeStart(sarajevo, ultimatum)).toBe('25일 뒤')
    expect(relativeStart(ultimatum, sarajevo)).toBe('25일 앞')
    expect(relativeStart(sarajevo, annexation)).toBe('5년 앞')
    expect(relativeStart(sarajevo, sarajevo)).toBe('같은 날')
  })
  it('연도만 알면 연도 차, BC도 부호 연도로', () => {
    expect(relativeStart(sarajevo, yearOnly)).toBe('약 31년 앞')
    expect(relativeStart({ startEra: 'BC', startYear: 49 }, caesar)).toBe('약 5년 뒤')
    expect(relativeStart(sarajevo, {})).toBeNull()
    expect(signedStartYear(caesar)).toBe(-44)
  })
})

describe('inferDirection · directionConflicts', () => {
  it('상대가 먼저면 상대 → 이 사건, 나중이면 이 사건 → 상대', () => {
    expect(inferDirection(sarajevo, annexation)).toBe('incoming')
    expect(inferDirection(sarajevo, ultimatum)).toBe('outgoing')
    expect(inferDirection(sarajevo, sarajevo)).toBeNull()
    expect(inferDirection(sarajevo, {})).toBeNull()
  })
  it('뒤 사건을 원인으로 두면 어긋남, 무방향 유형은 보지 않는다', () => {
    expect(directionConflicts('LED_TO', 'incoming', sarajevo, ultimatum)).toBe(true)
    expect(directionConflicts('LED_TO', 'outgoing', sarajevo, ultimatum)).toBe(false)
    expect(directionConflicts('RELATED', 'incoming', sarajevo, ultimatum)).toBe(false)
  })
})

describe('particle · relationSentence', () => {
  it('받침으로 조사를 고르고 괄호 덧말은 건너뛴다', () => {
    expect(particle('사라예보 암살 사건', '이/가')).toBe('이')
    expect(particle('오스트리아-헝가리의 대세르비아 최후통첩 (1914)', '이/가')).toBe('이')
    expect(particle('크림 전쟁', '과/와')).toBe('과')
    expect(particle('아바르 칸국 건국', '은/는')).toBe('은')
    expect(particle('파리 강화회의', '이/가')).toBe('가')
    expect(particle('WWI', '이/가')).toBe('이(가)')
  })
  it('문장은 저장 방향대로 읽힌다', () => {
    expect(relationSentence('LED_TO', 'outgoing', '사라예보 암살 사건', '7월 최후통첩')).toBe(
      '‘사라예보 암살 사건’이 ‘7월 최후통첩’의 직접 계기가 되었다',
    )
    expect(relationSentence('RESPONSE_TO', 'incoming', '파리 강화회의', '휴전')).toBe(
      '‘파리 강화회의’는 ‘휴전’에 대한 대응이다',
    )
  })
})

describe('byProximity', () => {
  it('이 사건과 가까운 순, 날짜 없는 후보는 뒤로', () => {
    const items: Array<{ id: string; startDate?: string; startDatePrecision?: string | null }> = [
      { id: 'a', ...yearOnly },
      { id: 'none' },
      { id: 'b', ...ultimatum },
      { id: 'c', ...annexation },
    ]
    expect(byProximity(sarajevo, items).map((item) => item.id)).toEqual(['b', 'c', 'a', 'none'])
  })
})
