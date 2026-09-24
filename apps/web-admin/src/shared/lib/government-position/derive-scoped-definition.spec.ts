import { personCareerApi } from '@/shared/api/person-career'

import {
  deriveCountryScopedPositionDefinition,
  ScopedDefinitionError,
} from './derive-scoped-definition'

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getPositionDefinitionById: jest.fn(),
    createPositionDefinition: jest.fn(),
    addPositionDefinitionScope: jest.fn(),
    deletePositionDefinition: jest.fn(),
  },
}))

const api = personCareerApi as jest.Mocked<typeof personCareerApi>

const 외무장관 = {
  id: 'def-fm',
  title: '외무장관',
  positionType: 'CABINET_MINISTER',
}

describe('deriveCountryScopedPositionDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getPositionDefinitionById.mockResolvedValue({
      ...외무장관,
      categoryId: 'cat-foreign',
      isMonarchical: false,
      rank: 10,
    })
    api.createPositionDefinition.mockResolvedValue({ id: 'def-new' })
    api.addPositionDefinitionScope.mockResolvedValue({ id: 'scope-1' })
  })

  it('원본을 복제해 국가 스코프를 붙인다 — 원본 정의는 건드리지 않는다', async () => {
    const result = await deriveCountryScopedPositionDefinition({
      source: 외무장관,
      newTitle: '외무대신',
      countryId: 'jp',
      pool: [외무장관],
    })

    expect(result).toEqual({ id: 'def-new', title: '외무대신', reused: false })
    expect(api.createPositionDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '외무대신',
        positionType: 'CABINET_MINISTER',
        // 카테고리를 물려줘야 중앙부처 연결이 끊기지 않는다
        categoryId: 'cat-foreign',
      }),
    )
    expect(api.addPositionDefinitionScope).toHaveBeenCalledWith(
      'def-new',
      expect.objectContaining({ countryId: 'jp' }),
    )
    // 원본 수정은 절대 일어나지 않는다
    expect(
      (api as unknown as { updatePositionDefinition?: unknown })
        .updatePositionDefinition,
    ).toBeUndefined()
  })

  it('역사국가도 함께 있으면 dual-fill로 스코프를 건다', async () => {
    await deriveCountryScopedPositionDefinition({
      source: 외무장관,
      newTitle: '외무대신',
      countryId: 'jp',
      historicalCountryId: 'empire-of-japan',
      pool: [],
    })
    expect(api.addPositionDefinitionScope).toHaveBeenCalledWith('def-new', {
      countryId: 'jp',
      historicalCountryId: 'empire-of-japan',
      note: '「외무장관」의 이 나라 명칭',
    })
  })

  it('같은 이름이 이미 이 나라에 있으면 새로 만들지 않고 고른다', async () => {
    const result = await deriveCountryScopedPositionDefinition({
      source: 외무장관,
      newTitle: '외무대신',
      countryId: 'jp',
      pool: [
        외무장관,
        { id: 'def-existing', title: '외무대신', positionType: 'CABINET_MINISTER' },
      ],
    })
    expect(result).toEqual({ id: 'def-existing', title: '외무대신', reused: true })
    expect(api.createPositionDefinition).not.toHaveBeenCalled()
  })

  it('이름이 그대로면 아무것도 만들지 않는다', async () => {
    const result = await deriveCountryScopedPositionDefinition({
      source: 외무장관,
      newTitle: ' 외무장관 ',
      countryId: 'jp',
      pool: [외무장관],
    })
    expect(result.reused).toBe(true)
    expect(result.id).toBe('def-fm')
    expect(api.createPositionDefinition).not.toHaveBeenCalled()
  })

  it('국가가 없으면 거부한다 — 스코프 없는 정의는 전역이 되어 모든 나라를 오염시킨다', async () => {
    await expect(
      deriveCountryScopedPositionDefinition({
        source: 외무장관,
        newTitle: '외무대신',
        pool: [],
      }),
    ).rejects.toBeInstanceOf(ScopedDefinitionError)
    expect(api.createPositionDefinition).not.toHaveBeenCalled()
  })

  it('스코프를 못 붙이면 방금 만든 정의를 지운다 — 전역으로 남기지 않는다', async () => {
    api.addPositionDefinitionScope.mockRejectedValue(new Error('network'))
    await expect(
      deriveCountryScopedPositionDefinition({
        source: 외무장관,
        newTitle: '외무대신',
        countryId: 'jp',
        pool: [],
      }),
    ).rejects.toBeInstanceOf(ScopedDefinitionError)
    expect(api.deletePositionDefinition).toHaveBeenCalledWith('def-new')
  })
})
