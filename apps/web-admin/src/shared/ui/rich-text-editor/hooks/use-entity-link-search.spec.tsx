import { act, renderHook } from '@testing-library/react'

// import.meta(client.ts) 회피 + 결과 제어를 위해 검색 모듈들을 mock.
jest.mock('@/shared/api/entity-link-search', () => ({
  fetchEntityLinkSearch: jest.fn(),
  mapEntityLinkRowsToMentionItems: (rows: unknown) => rows,
}))
jest.mock('@/shared/lib/mention/mention-system', () => ({
  searchMentionEntities: jest.fn(() => [
    { type: 'person', id: '1', name: '로컬결과' },
  ]),
}))
jest.mock('react-hot-toast', () => ({ toast: { error: jest.fn() } }))

import { fetchEntityLinkSearch } from '@/shared/api/entity-link-search'

import { useEntityLinkSearch } from './use-entity-link-search'

const fetchMock = fetchEntityLinkSearch as jest.Mock

const MENTIONS = {
  persons: [],
  events: [],
  countries: [],
  historicalCountries: [],
  militaryUnits: [],
  dynasties: [],
  politicalParties: [],
}

describe('useEntityLinkSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchMock.mockReset()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('active=false면 검색하지 않는다', () => {
    const { result } = renderHook(() =>
      useEntityLinkSearch({
        active: false,
        query: 'x',
        remote: true,
        mentionEntities: MENTIONS,
      }),
    )
    expect(result.current.results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('remote=false면 로컬 검색 결과를 즉시 채운다', () => {
    const { result } = renderHook(() =>
      useEntityLinkSearch({
        active: true,
        query: '로',
        remote: false,
        mentionEntities: MENTIONS,
      }),
    )
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].name).toBe('로컬결과')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('remote=true면 디바운스(280ms) 후 서버 검색 결과를 채운다', async () => {
    fetchMock.mockResolvedValue([{ type: 'event', id: '9', name: '서버결과' }])
    const { result } = renderHook(() =>
      useEntityLinkSearch({
        active: true,
        query: '검색어',
        remote: true,
        mentionEntities: MENTIONS,
      }),
    )
    expect(result.current.loading).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled() // 디바운스 전엔 호출 안 함
    await act(async () => {
      jest.advanceTimersByTime(280)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.results[0].name).toBe('서버결과')
    expect(result.current.loading).toBe(false)
  })

  it('remote=true + 빈 검색어면 로컬 샘플을 보여주고 fetch 안 함', () => {
    const { result } = renderHook(() =>
      useEntityLinkSearch({
        active: true,
        query: '   ',
        remote: true,
        mentionEntities: MENTIONS,
      }),
    )
    expect(result.current.results).toHaveLength(1)
    expect(result.current.loading).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
