import { effectiveLabel, formatArea, formatPopulation, summarizeTerritory } from './territory-transfer.lib'

const plc = { countryId: null, historicalCountryId: 'plc', name: '폴란드-리투아니아 연방' }
const russia = { countryId: null, historicalCountryId: 'ru', name: '러시아 제국' }
const austria = { countryId: null, historicalCountryId: 'at', name: '합스부르크 군주국' }
const prussia = { countryId: null, historicalCountryId: 'pr', name: '프로이센 왕국' }

describe('summarizeTerritory', () => {
  it('받은 쪽은 면적 큰 순, 내준 쪽은 합계, 면적 모르는 나라는 뒤', () => {
    const { gained, lost } = summarizeTerritory([
      { from: plc, to: prussia, areaKm2: 36_300, population: 580_000 },
      { from: plc, to: russia, areaKm2: 92_000, population: 1_300_000 },
      { from: plc, to: austria, areaKm2: null, population: null },
      { from: plc, to: austria, areaKm2: 83_000, population: 2_650_000 },
      { from: plc, to: { countryId: null, historicalCountryId: null, name: null }, areaKm2: 10, population: null },
    ])
    expect(gained.map((total) => total.party.name)).toEqual(['러시아 제국', '합스부르크 군주국', '프로이센 왕국'])
    expect(gained[1]).toMatchObject({ areaKm2: 83_000, rows: 2, hasArea: true })
    expect(lost).toHaveLength(1)
    expect(lost[0]).toMatchObject({ areaKm2: 211_310, population: 4_530_000, rows: 5 })
  })
})

describe('표기', () => {
  it('면적·인구·발효 시점', () => {
    expect(formatArea(92_000)).toBe('9.2만 km²')
    expect(formatArea(36_300)).toBe('3.6만 km²')
    expect(formatArea(1_234_000)).toBe('123만 km²')
    expect(formatArea(950)).toBe('950 km²')
    expect(formatPopulation(4_500_000)).toBe('450만 명')
    expect(formatPopulation(580_000)).toBe('58만 명')
    expect(effectiveLabel({ effectiveEra: 'AD', effectiveYear: 1772, effectiveMonth: 8, effectiveDay: 5 })).toBe('1772년 8월 5일')
    expect(effectiveLabel({ effectiveEra: null, effectiveYear: null, effectiveMonth: null, effectiveDay: null })).toBeNull()
  })
})
