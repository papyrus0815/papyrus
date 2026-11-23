import { chamberLabel, chamberSeatsAt } from './chamber'

jest.mock('./client', () => ({ getApiConnection: () => ({}) }))
jest.mock('./api.service', () => ({}))
jest.mock('./military-unit', () => ({}))

describe('원 — 정원·표기', () => {
  const camera = [
    { seats: 508, startEra: 'AD', startYear: 1861, endEra: 'AD', endYear: 1922 },
    { seats: 400, startEra: 'AD', startYear: 1929, endEra: 'AD', endYear: 1939 },
  ]

  it('그 해를 덮는 정원', () => {
    expect(chamberSeatsAt(camera, 1929)).toBe(400)
    expect(chamberSeatsAt(camera, 1900)).toBe(508)
  })

  it('덮는 이력이 없으면 모름 — 기간 없는 이력만 마지막 수단', () => {
    expect(chamberSeatsAt(camera, 1925)).toBeNull()
    expect(chamberSeatsAt([{ seats: 300 }], 1990)).toBe(300)
    expect(chamberSeatsAt([], 1990)).toBeNull()
  })

  it('정체 이름 칸 캐시와 같은 표기', () => {
    expect(chamberLabel({ name: '대의원', localName: 'Camera dei Deputati' })).toBe('대의원(Camera dei Deputati)')
    expect(chamberLabel({ name: '국회' })).toBe('국회')
  })
})
