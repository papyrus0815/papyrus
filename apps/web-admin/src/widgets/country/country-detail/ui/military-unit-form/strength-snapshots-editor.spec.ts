import {
  countFilledStrengthFields,
  createEmptyStrengthSnapshot,
  hydrateStrengthSnapshots,
  syncStrengthSnapshotsForUnit,
  validateStrengthSnapshots,
} from './strength-snapshots-editor'

const createObservationMock = jest.fn<Promise<{ id: string }>, unknown[]>(
  async () => ({ id: 'obs-created' }),
)
const updateObservationMock = jest.fn<Promise<{ id: string }>, unknown[]>(
  async () => ({ id: 'obs-updated' }),
)
const deleteObservationMock = jest.fn<Promise<void>, unknown[]>(async () => {})

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/shared/api/evidence', () => ({
  createObservation: (...args: unknown[]) => createObservationMock(...args),
  updateObservation: (...args: unknown[]) => updateObservationMock(...args),
  deleteObservation: (...args: unknown[]) => deleteObservationMock(...args),
}))

describe('strength-snapshots-editor helpers', () => {
  beforeEach(() => {
    createObservationMock.mockClear()
    updateObservationMock.mockClear()
    deleteObservationMock.mockClear()
  })

  it('같은 시점·메모의 측정값들을 하나의 스냅샷 카드로 묶고, 총병력 지표 충돌 시 별도 스냅샷으로 분리한다', () => {
    const snapshots = hydrateStrengthSnapshots([
      {
        id: 'obs-1',
        metricKey: 'military.unit.authorized_wartime',
        metricLabelKo: '전시 편제 정원',
        value: '14989',
        unit: 'person',
        approx: false,
        atLeast: false,
        method: 'OFFICIAL_CLAIM',
        start: { era: 'AD', year: 1941, month: 6, day: 22, precision: 'day' },
        note: 'KStN 1941년형 보병사단 편제표',
      },
      {
        id: 'obs-2',
        metricKey: 'military.unit.officers',
        metricLabelKo: '장교 수',
        value: '518',
        unit: 'person',
        approx: false,
        atLeast: false,
        method: 'OFFICIAL_CLAIM',
        start: { era: 'AD', year: 1941, month: 6, day: 22, precision: 'day' },
        note: 'KStN 1941년형 보병사단 편제표',
      },
      {
        id: 'obs-3',
        metricKey: 'military.artillery',
        metricLabelKo: '화포 수',
        low: '120',
        high: '140',
        unit: 'piece',
        approx: true,
        atLeast: false,
        method: 'ESTIMATED',
        start: { era: 'AD', year: 1941, month: 6, day: 22, precision: 'day' },
        note: 'KStN 1941년형 보병사단 편제표',
      },
      {
        id: 'obs-4',
        metricKey: 'military.unit.actual_strength',
        metricLabelKo: '실병력 (현원)',
        value: '11200',
        unit: 'person',
        approx: false,
        atLeast: false,
        method: 'COUNTED',
        start: { era: 'AD', year: 1941, month: 6, day: 22, precision: 'day' },
        note: 'KStN 1941년형 보병사단 편제표',
      },
    ])

    expect(snapshots).toHaveLength(2)
    expect(snapshots[0]).toMatchObject({
      basisKind: 'wartime',
      era: 'AD',
      year: '1941',
      month: '6',
      day: '22',
      totalStrength: '14,989',
      officers: '518',
      artillery: '약 120~140',
      basisNote: 'KStN 1941년형 보병사단 편제표',
    })
    expect(snapshots[1]).toMatchObject({
      basisKind: 'actual',
      totalStrength: '11,200',
    })
    expect(countFilledStrengthFields(snapshots)).toBe(4)
  })

  it('숫자·범위·근사·하한 및 기원전(BC) 시점을 검증하고 잘못된 날짜나 문자열은 거부한다', () => {
    const valid = createEmptyStrengthSnapshot({ branch: 'NAVY' })
    valid.era = 'BC'
    valid.year = '480'
    valid.month = '9'
    valid.totalStrength = '15,000~18,000'
    valid.vessels = '약 300+'
    expect(validateStrengthSnapshots([valid])).toBeNull()

    const missingYear = createEmptyStrengthSnapshot()
    missingYear.month = '6'
    missingYear.totalStrength = '10000'
    expect(validateStrengthSnapshots([missingYear])).toContain('연도')

    const badNumber = createEmptyStrengthSnapshot()
    badNumber.year = '1950'
    badNumber.tanks = '전차다수'
    expect(validateStrengthSnapshots([badNumber])).toContain('전차 수')
  })

  it('syncStrengthSnapshotsForUnit이 신규 생성·기존 수정·비워진 항목 삭제를 동기화한다', async () => {
    const initial = [
      {
        id: 'obs-total',
        metricKey: 'military.unit.authorized_wartime',
        metricLabelKo: '전시 편제 정원',
        value: '10000',
        unit: 'person',
        approx: false,
        atLeast: false,
      },
      {
        id: 'obs-old-tanks',
        metricKey: 'military.tanks',
        metricLabelKo: '전차 수',
        value: '50',
        unit: 'vehicle',
        approx: false,
        atLeast: false,
      },
    ]

    const hydrated = hydrateStrengthSnapshots(initial, 'ARMY')
    hydrated[0].basisKind = 'actual'
    hydrated[0].totalStrength = '9,450'
    hydrated[0].tanks = '' // 비워서 삭제 유도
    hydrated[0].officers = '410' // 신규 추가

    await syncStrengthSnapshotsForUnit('unit-1', hydrated, initial)

    expect(updateObservationMock).toHaveBeenCalledWith(
      'obs-total',
      expect.objectContaining({
        metricKey: 'military.unit.actual_strength',
        value: '9450',
      }),
    )
    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectType: 'MILITARY_UNIT',
        subjectId: 'unit-1',
        metricKey: 'military.unit.officers',
        value: '410',
      }),
    )
    expect(deleteObservationMock).toHaveBeenCalledWith('obs-old-tanks')
  })
})
