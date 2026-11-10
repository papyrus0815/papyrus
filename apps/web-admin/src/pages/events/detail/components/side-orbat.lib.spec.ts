import type { SideUnitView } from '@/shared/api/event-sides'

import { buildSideOrbatTree, formatSideUnitMetric, summarizeOrbatByType } from './side-orbat.lib'

function makeSideUnit(partial: {
  id: string
  unitId: string
  name: string
  unitType?: string | null
  role?: 'MAIN_EFFORT' | 'SUPPORTING' | 'RESERVE' | 'DEFENSE' | null
  parents?: Array<{ id: string; name: string; unitType?: string | null }>
  department?: { id: string; name: string; abbreviation: string | null } | null
  commander?: { id: string; name: string; rank: string | null; role: string | null; isOverride: boolean } | null
  sortOrder?: number
}): SideUnitView {
  return {
    id: partial.id,
    sideId: 'side-axis',
    parentUnitId: null,
    commanderId: null,
    commander: partial.commander ?? null,
    role: partial.role ?? null,
    note: null,
    sortOrder: partial.sortOrder ?? 0,
    metrics: [],
    unit: {
      id: partial.unitId,
      name: partial.name,
      unitType: partial.unitType ?? null,
      branch: 'ARMY',
      nickname: null,
      countryId: null,
      historicalCountryId: 'hc-nazi-germany',
      countryName: '나치 독일',
      parents: partial.parents ?? [],
      department: partial.department ?? null,
    },
  }
}

describe('buildSideOrbatTree', () => {
  it('바르바로사 작전 전투서열(집단군 → 기갑집단 → 기갑군단)을 계층 트리로 조립한다', () => {
    const okh = { id: 'dept-okh', name: '육군최고사령부', abbreviation: 'OKH' }
    const rows: SideUnitView[] = [
      makeSideUnit({
        id: 'row-agc',
        unitId: 'u-agc',
        name: '중부집단군',
        unitType: 'ARMY_GROUP',
        role: 'MAIN_EFFORT',
        department: okh,
        commander: {
          id: 'p-bock',
          name: '페도르 폰 보크',
          rank: '원수',
          role: '사령관',
          isOverride: false,
        },
        sortOrder: 0,
      }),
      makeSideUnit({
        id: 'row-pg2',
        unitId: 'u-pg2',
        name: '제2기갑집단',
        unitType: 'FIELD_ARMY',
        role: 'MAIN_EFFORT',
        parents: [{ id: 'u-agc', name: '중부집단군', unitType: 'ARMY_GROUP' }],
        department: okh,
        commander: {
          id: 'p-guderian',
          name: '하인츠 구데리안',
          rank: '상급대장',
          role: '사령관',
          isOverride: false,
        },
        sortOrder: 1,
      }),
      makeSideUnit({
        id: 'row-corps24',
        unitId: 'u-corps24',
        name: '제24기갑군단',
        unitType: 'CORPS',
        parents: [
          { id: 'u-pg2', name: '제2기갑집단', unitType: 'FIELD_ARMY' },
          { id: 'u-agc', name: '중부집단군', unitType: 'ARMY_GROUP' },
        ],
        department: okh,
        sortOrder: 2,
      }),
    ]

    const tree = buildSideOrbatTree(rows)
    expect(tree).toHaveLength(1)
    expect(tree[0].unitId).toBe('u-agc')
    expect(tree[0].unitTypeLabel).toBe('집단군')
    expect(tree[0].deployed?.commander?.name).toBe('페도르 폰 보크')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].unitId).toBe('u-pg2')
    expect(tree[0].children[0].deployed?.commander?.name).toBe('하인츠 구데리안')
    expect(tree[0].children[0].children).toHaveLength(1)
    expect(tree[0].children[0].children[0].unitId).toBe('u-corps24')
  })

  it('하위 부대만 투입돼 있어도 parents 사슬로 상급 편제 노드를 자동 복원한다', () => {
    const rows: SideUnitView[] = [
      makeSideUnit({
        id: 'row-6army',
        unitId: 'u-6army',
        name: '제6군',
        unitType: 'FIELD_ARMY',
        parents: [{ id: 'u-ags', name: '남부집단군', unitType: 'ARMY_GROUP' }],
      }),
    ]

    const tree = buildSideOrbatTree(rows)
    expect(tree).toHaveLength(1)
    expect(tree[0].unitId).toBe('u-ags')
    expect(tree[0].deployed).toBeNull()
    expect(tree[0].unitTypeLabel).toBe('집단군')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].unitId).toBe('u-6army')
    expect(tree[0].children[0].deployed?.id).toBe('row-6army')
  })

  it('급수별 요약과 부대 측정값 포맷을 반환한다', () => {
    const rows: SideUnitView[] = [
      makeSideUnit({ id: '1', unitId: 'u1', name: '북부집단군', unitType: 'ARMY_GROUP' }),
      makeSideUnit({ id: '2', unitId: 'u2', name: '중부집단군', unitType: 'ARMY_GROUP' }),
      makeSideUnit({ id: '3', unitId: 'u3', name: '제2항공함대', unitType: 'AIR_FLEET' }),
    ]
    expect(summarizeOrbatByType(rows)).toEqual([
      { unitType: 'ARMY_GROUP', label: '집단군', count: 2 },
      { unitType: 'AIR_FLEET', label: '항공함대', count: 1 },
    ])

    expect(
      formatSideUnitMetric({
        id: 'm1',
        metricKey: 'troops',
        metricName: '병력',
        unit: '명',
        value: 1000000,
        low: null,
        high: null,
        approx: true,
        qualifier: null,
      }),
    ).toBe('병력 약 1,000,000명')
  })
})
