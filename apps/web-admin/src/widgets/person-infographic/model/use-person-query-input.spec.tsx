/**
 * 검색창이 두 개(좌측 인물 목록 / 우측 인포그래픽)일 때의 회귀 테스트.
 *
 * 각 검색창이 자기 디바운스 값을 store에 되쏘던 구조에서는, 한쪽이 커밋한 값을 받은 다른 쪽이
 * 아직 트레일링 중인 **옛 디바운스 값**으로 store를 되돌려 무한 업데이트가 났다
 * (Maximum update depth exceeded). 아래 테스트는 그 왕복이 사라졌는지 본다.
 */
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'

import { usePersonInfographicFilterStore } from './filter.store'
import { usePersonQueryInput } from './use-person-query-input'

/** 한 검색창 — input을 노출하고 setInput을 버튼으로 호출 */
function QueryBox({ name }: { name: string }) {
  const { input, setInput, query } = usePersonQueryInput()
  return (
    <div>
      <span data-testid={`${name}-input`}>{input}</span>
      <span data-testid={`${name}-query`}>{query}</span>
      <button type="button" onClick={() => setInput('나폴레옹')}>
        {name}-type
      </button>
    </div>
  )
}

/** 두 검색창이 동시에 떠 있는 실제 지면 구성 */
function TwoBoxes() {
  return (
    <>
      <QueryBox name="left" />
      <QueryBox name="right" />
    </>
  )
}

describe('usePersonQueryInput', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    act(() => {
      usePersonInfographicFilterStore.getState().setQuery('')
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('한쪽 입력이 store와 반대쪽 입력칸까지 전파되고, 되돌아오지 않는다', () => {
    render(<TwoBoxes />)

    act(() => {
      screen.getByText('left-type').click()
    })
    // 디바운스 정착
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(usePersonInfographicFilterStore.getState().query).toBe('나폴레옹')
    expect(screen.getByTestId('left-input')).toHaveTextContent('나폴레옹')
    expect(screen.getByTestId('right-input')).toHaveTextContent('나폴레옹')

    // 반대쪽이 자기 트레일링 값('')으로 store를 되돌리지 않는지 — 충분히 더 흘려본다
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(usePersonInfographicFilterStore.getState().query).toBe('나폴레옹')
    expect(screen.getByTestId('right-input')).toHaveTextContent('나폴레옹')
  })

  it('외부(URL 진입·필터 초기화)에서 store가 바뀌면 두 입력칸이 모두 따라간다', () => {
    render(<TwoBoxes />)

    act(() => {
      usePersonInfographicFilterStore.getState().setQuery('처칠')
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByTestId('left-input')).toHaveTextContent('처칠')
    expect(screen.getByTestId('right-input')).toHaveTextContent('처칠')
    expect(usePersonInfographicFilterStore.getState().query).toBe('처칠')
  })
})
