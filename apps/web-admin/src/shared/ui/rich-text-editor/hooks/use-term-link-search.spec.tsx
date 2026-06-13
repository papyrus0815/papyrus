import { act, renderHook } from '@testing-library/react'

// glossary는 client.ts(import.meta)를 끌어오므로 mock.
jest.mock('@/shared/api/glossary', () => ({ getGlossaryTerms: jest.fn() }))

import { getGlossaryTerms } from '@/shared/api/glossary'

import { useTermLinkSearch } from './use-term-link-search'

const getMock = getGlossaryTerms as jest.Mock

// 단언은 toHaveProperty(문자열 키)로 — 객체 리터럴 { q: ... }의 키 q가
// no-restricted-syntax(한 글자 변수) 룰에 걸리는 것을 피한다.
function firstArg() {
  return getMock.mock.calls[0][0] as Record<string, unknown>
}

describe('useTermLinkSearch', () => {
  beforeEach(() => getMock.mockReset())

  it('search(query)는 검색어로 조회하고 결과를 채운다', async () => {
    getMock.mockResolvedValue([{ id: 't1', name: '봉건제' }])
    const { result } = renderHook(() => useTermLinkSearch())
    await act(async () => {
      await result.current.search('봉건')
    })
    expect(getMock).toHaveBeenCalledTimes(1)
    expect(firstArg()).toHaveProperty('q', '봉건')
    expect(result.current.results).toHaveLength(1)
    expect(result.current.selectedIndex).toBe(0)
  })

  it('빈 검색어는 검색어 키 없이 전체 조회', async () => {
    getMock.mockResolvedValue([])
    const { result } = renderHook(() => useTermLinkSearch())
    await act(async () => {
      await result.current.search('')
    })
    expect(getMock).toHaveBeenCalledWith({})
  })

  it('documentScope가 event면 eventId를 포함', async () => {
    getMock.mockResolvedValue([])
    const { result } = renderHook(() =>
      useTermLinkSearch({ type: 'event', id: 'e1' }),
    )
    await act(async () => {
      await result.current.search('x')
    })
    expect(firstArg()).toHaveProperty('q', 'x')
    expect(firstArg()).toHaveProperty('eventId', 'e1')
  })

  it('검색 실패 시 결과를 비운다', async () => {
    getMock.mockResolvedValueOnce([{ id: 't1', name: 'a' }])
    const { result } = renderHook(() => useTermLinkSearch())
    await act(async () => {
      await result.current.search('a')
    })
    expect(result.current.results).toHaveLength(1)

    getMock.mockRejectedValueOnce(new Error('fail'))
    await act(async () => {
      await result.current.search('b')
    })
    expect(result.current.results).toHaveLength(0)
  })
})
