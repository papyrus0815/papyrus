import {
  adminTenureHintFromRow,
  dedupeHeadsOfStateTenuresForDisplay,
  isHeadOfStateTenureRow,
  tenureRowShadowsSovereignReign,
} from './heads-of-state-tenure-dedup'

describe('heads-of-state-tenure-dedup', () => {
  it('adminTenureHintFromRow', () => {
    expect(adminTenureHintFromRow({})).toBeNull()
    expect(
      adminTenureHintFromRow({
        _displayLinkedHeadTenure: {
          id: 't1',
          cabinetName: '제1내각',
        },
      }),
    ).toContain('제1내각')
    expect(
      adminTenureHintFromRow({
        _displayLinkedHeadTenure: { id: 't1', cabinetName: '' },
      }),
    ).toContain('행정부 탭')
  })

  it('isHeadOfStateTenureRow', () => {
    expect(isHeadOfStateTenureRow({ positionType: 'HEAD_OF_STATE' })).toBe(
      true,
    )
    expect(
      isHeadOfStateTenureRow({
        positionDefinition: { positionType: 'HEAD_OF_STATE' },
      }),
    ).toBe(true)
    expect(isHeadOfStateTenureRow({ positionType: 'HEAD_OF_GOVERNMENT' })).toBe(
      false,
    )
  })

  it('tenureRowShadowsSovereignReign matches person·start·country', () => {
    const t = {
      personId: 'A1',
      startDate: '1700-01-15T00:00:00.000Z',
      countryId: 'c1',
      historicalCountryId: null,
    }
    const s = {
      personId: 'a1',
      startDate: '1700-01-15',
      countryId: 'c1',
      historicalCountryId: null,
    }
    expect(tenureRowShadowsSovereignReign(t, s)).toBe(true)
    expect(tenureRowShadowsSovereignReign({ ...t, personId: 'x' }, s)).toBe(
      false,
    )
  })

  it('dedupeHeadsOfStateTenuresForDisplay hides shadow HEAD_OF_STATE tenure', () => {
    const sovereign = {
      id: 'sov-1',
      recordKind: 'SOVEREIGN_REIGN',
      personId: 'p1',
      startDate: '1800-05-01T00:00:00.000Z',
      countryId: 'c1',
      historicalCountryId: null,
    }
    const shadowTenure = {
      id: 'ten-1',
      recordKind: 'TENURE',
      positionType: 'HEAD_OF_STATE',
      personId: 'p1',
      startDate: '1800-05-01T00:00:00.000Z',
      countryId: 'c1',
      historicalCountryId: null,
      cabinetId: 'cab-1',
      cabinet: { id: 'cab-1', name: '제1내각' },
    }
    const other = {
      id: 'ten-2',
      recordKind: 'TENURE',
      positionType: 'HEAD_OF_GOVERNMENT',
      personId: 'p2',
      startDate: '1801-01-01T00:00:00.000Z',
      countryId: 'c1',
      historicalCountryId: null,
    }
    const out = dedupeHeadsOfStateTenuresForDisplay([sovereign, shadowTenure, other])
    expect(out.map((x) => x.id).sort()).toEqual(['sov-1', 'ten-2'].sort())
    const enriched = out.find((x) => x.id === 'sov-1')
    expect(enriched?._displayLinkedHeadTenure?.id).toBe('ten-1')
    expect(enriched?._displayLinkedHeadTenure?.cabinetName).toBe('제1내각')
  })
})
