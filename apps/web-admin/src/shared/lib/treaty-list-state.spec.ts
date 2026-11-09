import {
  parseTreatyListState,
  readListSearch,
  serializeTreatyListState,
  treatyListSearchOf,
} from './treaty-list-state'

/* treaty.ts는 axios 클라이언트(import.meta.env)를 만들어 jest에서 못 읽는다 — 라벨 표만 대신 준다 */
jest.mock('@/shared/api/treaty', () => ({
  TREATY_TYPE_LABELS: {
    PEACE: '평화 조약',
    ALLIANCE: '동맹 조약',
    NON_AGGRESSION: '불가침 조약',
  },
}))

describe('treaty-list-state', () => {
  it('parses known values and drops unknown type/sort', () => {
    expect(
      parseTreatyListState(new URLSearchParams('?q=베르&type=PEACE&sort=name')),
    ).toEqual({ query: '베르', type: 'PEACE', sort: 'name' })
    expect(
      parseTreatyListState(new URLSearchParams('?type=NOPE&sort=weird')),
    ).toEqual({ query: '', type: '', sort: 'date-desc' })
  })

  it('omits defaults when serializing', () => {
    expect(
      serializeTreatyListState({
        query: '',
        type: '',
        sort: 'date-desc',
      }).toString(),
    ).toBe('')
    expect(treatyListSearchOf({ query: '', type: '', sort: 'date-desc' })).toBe(
      '',
    )
    expect(
      treatyListSearchOf({ query: '', type: 'ALLIANCE', sort: 'date-asc' }),
    ).toBe('?type=ALLIANCE&sort=date-asc')
  })

  it('round-trips through the router state reader', () => {
    const search = treatyListSearchOf({
      query: '난징',
      type: 'PEACE',
      sort: 'date-desc',
    })
    expect(readListSearch({ treatyListSearch: search })).toBe(search)
    expect(
      parseTreatyListState(
        new URLSearchParams(readListSearch({ treatyListSearch: search })),
      ),
    ).toEqual({ query: '난징', type: 'PEACE', sort: 'date-desc' })
  })

  it('ignores foreign or malformed router state', () => {
    expect(readListSearch(null)).toBe('')
    expect(readListSearch({ treatyListSearch: 'type=PEACE' })).toBe('')
    expect(readListSearch({ from: 'event' })).toBe('')
  })
})
