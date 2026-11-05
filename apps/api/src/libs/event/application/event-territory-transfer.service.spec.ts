import { BadRequestException } from '@nestjs/common'

import { normalizeInput, participantRolesOf } from './event-territory-transfer.service'

const base = { regionName: '왕령 프로이센', method: 'PARTITION' as const }

describe('영토 이전 — normalizeInput', () => {
  it('빈 문자열은 null, 순서는 sortOrder, 발효 시점 정밀도는 칸에서 파생', () => {
    const row = normalizeInput(
      { ...base, fromHistoricalCountryId: 'plc', toHistoricalCountryId: 'prussia', fromName: '  ', effectiveYear: 1772, effectiveMonth: 8, effectiveDay: 5 },
      2,
    )
    expect(row).toMatchObject({ fromName: null, sortOrder: 2, effectiveEra: 'AD', effectivePrecision: 'day' })
  })

  it('한쪽에 둘 이상 · 양쪽 모두 비움 · 같은 나라 · 지역 없음 · 연도 없는 월은 400', () => {
    expect(() => normalizeInput({ ...base, fromCountryId: 'a', fromName: 'b' }, 0)).toThrow(BadRequestException)
    expect(() => normalizeInput({ ...base }, 0)).toThrow('하나는 있어야')
    expect(() => normalizeInput({ ...base, fromHistoricalCountryId: 'x', toHistoricalCountryId: 'x' }, 0)).toThrow('같습니다')
    expect(() => normalizeInput({ ...base, regionName: ' ', toName: '자유시' }, 0)).toThrow('지역')
    expect(() => normalizeInput({ ...base, toName: '자유시', effectiveMonth: 3 }, 0)).toThrow('연도')
  })

  it('BC 발효 시점은 era를 지킨다', () => {
    expect(normalizeInput({ ...base, toName: 'X', effectiveEra: 'BC', effectiveYear: 241 }, 0)).toMatchObject({
      effectiveEra: 'BC',
      effectiveYear: 241,
      effectivePrecision: 'year',
    })
  })
})

describe('영토 이전 — participantRolesOf', () => {
  it('내주기만 = 피해국, 받기만 = 수혜국, 둘 다 = 참여국, 자유 이름은 뺀다', () => {
    const roles = participantRolesOf([
      { fromCountryId: null, fromHistoricalCountryId: 'plc', toCountryId: null, toHistoricalCountryId: 'russia' },
      { fromCountryId: null, fromHistoricalCountryId: 'plc', toCountryId: null, toHistoricalCountryId: 'prussia' },
      { fromCountryId: null, fromHistoricalCountryId: 'prussia', toCountryId: null, toHistoricalCountryId: null },
    ])
    expect(roles).toEqual([
      { countryId: null, historicalCountryId: 'plc', role: 'VICTIM' },
      { countryId: null, historicalCountryId: 'russia', role: 'BENEFICIARY' },
      { countryId: null, historicalCountryId: 'prussia', role: 'PARTICIPANT' },
    ])
  })
})
