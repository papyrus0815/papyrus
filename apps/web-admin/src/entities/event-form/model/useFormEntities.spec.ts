/**
 * useFormEntities — `only` 부분 로드 회귀 테스트.
 *
 * 핵심 계약: 캐시는 **모듈 전역 단일 스냅샷**이다. 부분 로드 결과를 여기에 써 넣으면,
 * 8종을 전부 기대하는 화면(국가 상세의 사건 등록 폼 등)이 그 캐시를 집어 빈 배열을 받는다.
 * 그래서 부분 로드는 캐시를 **읽기만** 해야 한다.
 */
import { act, renderHook, waitFor } from '@testing-library/react'

import { useFormEntities } from './useFormEntities'

jest.mock('@/shared/api/countries', () => ({ getAllCountries: jest.fn() }))
jest.mock('@/shared/api/historical-countries', () => ({
  getAllHistoricalCountries: jest.fn(),
}))
jest.mock('@/shared/api/event-categories', () => ({
  getAllEventCategories: jest.fn(),
}))
jest.mock('@/shared/api/persons', () => ({ getAllPersons: jest.fn() }))
jest.mock('@/shared/api/events', () => ({ getAllEvents: jest.fn() }))
jest.mock('@/shared/api/military-unit', () => ({
  militaryUnitApi: { getAll: jest.fn() },
}))
jest.mock('@/shared/api/dynasty', () => ({ dynastyApi: { getAll: jest.fn() } }))
jest.mock('@/shared/api/political-party', () => ({
  politicalPartyApi: { getAll: jest.fn() },
}))

const countriesApi = jest.requireMock('@/shared/api/countries') as {
  getAllCountries: jest.Mock
}
const historicalApi = jest.requireMock('@/shared/api/historical-countries') as {
  getAllHistoricalCountries: jest.Mock
}
const categoriesApi = jest.requireMock('@/shared/api/event-categories') as {
  getAllEventCategories: jest.Mock
}
const personsApi = jest.requireMock('@/shared/api/persons') as {
  getAllPersons: jest.Mock
}
const eventsApi = jest.requireMock('@/shared/api/events') as {
  getAllEvents: jest.Mock
}
const militaryApi = jest.requireMock('@/shared/api/military-unit') as {
  militaryUnitApi: { getAll: jest.Mock }
}
const dynastyApiMock = jest.requireMock('@/shared/api/dynasty') as {
  dynastyApi: { getAll: jest.Mock }
}
const partyApi = jest.requireMock('@/shared/api/political-party') as {
  politicalPartyApi: { getAll: jest.Mock }
}

const ALL_MOCKS = () => [
  personsApi.getAllPersons,
  countriesApi.getAllCountries,
  historicalApi.getAllHistoricalCountries,
  categoriesApi.getAllEventCategories,
  militaryApi.militaryUnitApi.getAll,
  eventsApi.getAllEvents,
  dynastyApiMock.dynastyApi.getAll,
  partyApi.politicalPartyApi.getAll,
]

/**
 * 캐시는 모듈 전역이라 테스트 간에 살아남는다. `jest.resetModules()`로 격리하면 React가
 * 두 벌이 되어 훅 디스패처가 null이 되므로(React 19), 대신 **시계를 앞으로 돌려** TTL을
 * 만료시키는 방식으로 격리한다.
 */
let mockedNow = 1_000_000

beforeEach(() => {
  jest.clearAllMocks()
  // 이전 테스트가 남긴 캐시를 TTL(60s) 밖으로 밀어낸다
  mockedNow += 10 * 60_000
  jest.spyOn(Date, 'now').mockImplementation(() => mockedNow)
  personsApi.getAllPersons.mockResolvedValue([{ id: 'p1' }])
  countriesApi.getAllCountries.mockResolvedValue([{ id: 'c1' }])
  historicalApi.getAllHistoricalCountries.mockResolvedValue([{ id: 'h1' }])
  categoriesApi.getAllEventCategories.mockResolvedValue([{ id: 'cat1' }])
  militaryApi.militaryUnitApi.getAll.mockResolvedValue([{ id: 'm1' }])
  eventsApi.getAllEvents.mockResolvedValue([{ id: 'e1' }])
  dynastyApiMock.dynastyApi.getAll.mockResolvedValue([{ id: 'd1' }])
  partyApi.politicalPartyApi.getAll.mockResolvedValue([{ id: 'pp1' }])
})

it('인자 없이 부르면 8종을 전부 로드한다 (기존 호출부 호환)', async () => {
  const { result } = renderHook(() => useFormEntities())

  await waitFor(() => expect(result.current.isLoading).toBe(false))
  ALL_MOCKS().forEach((mockFn) => expect(mockFn).toHaveBeenCalledTimes(1))
  expect(result.current.availableCountries).toHaveLength(1)
  expect(result.current.availableEvents).toHaveLength(1)
})

it('only를 주면 지정한 것만 부르고 나머지 API는 건드리지 않는다', async () => {
  const { result } = renderHook(() =>
    useFormEntities({ only: ['countries', 'historicalCountries', 'categories'] }),
  )

  await waitFor(() => expect(result.current.isLoading).toBe(false))

  expect(countriesApi.getAllCountries).toHaveBeenCalledTimes(1)
  expect(historicalApi.getAllHistoricalCountries).toHaveBeenCalledTimes(1)
  expect(categoriesApi.getAllEventCategories).toHaveBeenCalledTimes(1)
  // 사건 전량 조회를 포함한 나머지 5개는 호출되지 않아야 한다
  expect(eventsApi.getAllEvents).not.toHaveBeenCalled()
  expect(personsApi.getAllPersons).not.toHaveBeenCalled()
  expect(militaryApi.militaryUnitApi.getAll).not.toHaveBeenCalled()
  expect(dynastyApiMock.dynastyApi.getAll).not.toHaveBeenCalled()
  expect(partyApi.politicalPartyApi.getAll).not.toHaveBeenCalled()

  expect(result.current.availableCountries).toHaveLength(1)
  expect(result.current.availableEvents).toEqual([])
})

it('부분 로드는 공용 캐시를 오염시키지 않는다 — 뒤이은 전체 로드가 8종을 다 받는다', async () => {
  const partial = renderHook(() => useFormEntities({ only: ['countries'] }))
  await waitFor(() => expect(partial.result.current.isLoading).toBe(false))
  partial.unmount()

  // 부분 로드가 캐시를 썼다면 아래는 캐시 히트로 8종이 빈 배열이 된다.
  const full = renderHook(() => useFormEntities())
  await waitFor(() => expect(full.result.current.isLoading).toBe(false))

  expect(full.result.current.availablePersons).toHaveLength(1)
  expect(full.result.current.availableEvents).toHaveLength(1)
  expect(full.result.current.availableDynasties).toHaveLength(1)
  expect(eventsApi.getAllEvents).toHaveBeenCalledTimes(1)
})

it('신선한 전체 캐시가 있으면 부분 요청은 네트워크 없이 충족된다', async () => {
  const full = renderHook(() => useFormEntities())
  await waitFor(() => expect(full.result.current.isLoading).toBe(false))
  full.unmount()

  const partial = renderHook(() => useFormEntities({ only: ['countries'] }))
  await waitFor(() => expect(partial.result.current.isLoading).toBe(false))

  // 캐시 히트 → 추가 호출 0
  expect(countriesApi.getAllCountries).toHaveBeenCalledTimes(1)
  expect(partial.result.current.availableCountries).toHaveLength(1)
})

it('개별 API가 실패해도 나머지는 살아남는다 (폼이 통째로 못 열리면 안 된다)', async () => {
  categoriesApi.getAllEventCategories.mockRejectedValue(new Error('boom'))
  const { result } = renderHook(() =>
    useFormEntities({ only: ['countries', 'categories'] }),
  )
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  expect(result.current.availableCountries).toHaveLength(1)
  expect(result.current.dbCategories).toEqual([])
})

it('only 배열을 매 렌더 새로 만들어도 재로드하지 않는다 (참조 불안정 → 무한 루프 방지)', async () => {
  const { result, rerender } = renderHook(() =>
    // 인라인 리터럴 = 매 렌더 새 참조
    useFormEntities({ only: ['countries'] }),
  )
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  await act(async () => {
    rerender()
    rerender()
    rerender()
  })

  expect(countriesApi.getAllCountries).toHaveBeenCalledTimes(1)
})
