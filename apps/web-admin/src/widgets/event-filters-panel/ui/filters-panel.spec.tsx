import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import { FILTER_ALL } from '@/features/event-list/lib'

import { FiltersPanel } from './filters-panel'

/**
 * 필터 팝오버 회귀 가드 (2026-07-28 검토 P1-1).
 *
 * 팝오버는 `FilterGroup`(height 34px + overflow:hidden) 안에서 absolute로 그려지던
 * 시절 화면에 전혀 나타나지 않았다 — 클리핑 조상이 컨테이닝 블록 체인에 있어
 * z-index로는 벗어날 수 없었다. 지금은 body로 포털한다.
 *
 * jsdom은 레이아웃을 계산하지 않아 '잘렸는지'를 직접 볼 수 없다. 대신 포털 전환이
 * 반드시 지켜야 하는 두 계약을 고정한다:
 *  1) 열면 옵션이 FilterGroup 밖(document.body 직속)에 렌더된다 = 클리핑 조상 이탈
 *  2) 옵션 클릭이 onSelect까지 도달한다 — 외부클릭 감지가 포털 노드를 "바깥"으로
 *     오판하면 mousedown 단계에서 언마운트돼 click이 영영 발화하지 않는다.
 */
const CATEGORIES = [
  { id: 'cat-war', name: '전쟁' },
  { id: 'cat-treaty', name: '조약' },
] as never[]

const baseProps = {
  selectedCategory: FILTER_ALL,
  selectedCountry: FILTER_ALL,
  selectedContinent: FILTER_ALL,
  selectedCentury: FILTER_ALL,
  showFlatView: false,
  dbCategories: CATEGORIES,
  availableCenturies: [19, 20],
  countries: [] as never[],
  historicalCountries: [] as never[],
  continents: [] as never[],
  onSelectCentury: jest.fn(),
  onToggleFlatView: jest.fn(),
  onShowCategoryModal: jest.fn(),
  onShowCountryModal: jest.fn(),
}

describe('FiltersPanel — 카테고리 인라인 팝오버', () => {
  it('트리거를 누르면 옵션이 FilterGroup 밖(포털)에 렌더된다', () => {
    const { container } = renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
    )

    expect(screen.queryByRole('option', { name: '전쟁' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '카테고리 필터' }))

    const option = screen.getByRole('option', { name: '전쟁' })
    expect(option).toBeInTheDocument()
    // 포털됐다면 위젯이 마운트된 컨테이너 서브트리 안에는 없어야 한다.
    // (= FilterGroup의 overflow 클리핑 사정권 밖)
    expect(container.contains(option)).toBe(false)
  })

  it('옵션 클릭이 onSelect까지 도달한다 — 포털 노드를 외부클릭으로 오판하지 않음', () => {
    const onSelectCategory = jest.fn()
    renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={onSelectCategory} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '카테고리 필터' }))
    const option = screen.getByRole('option', { name: '조약' })

    // 실제 포인터 순서를 재현 — mousedown이 먼저 온다. 외부클릭 핸들러가 여기서
    // 팝오버를 닫아버리면 아래 click은 사라진 노드에 떨어져 아무 일도 안 일어난다.
    fireEvent.mouseDown(option)
    expect(option).toBeInTheDocument()

    fireEvent.click(option)
    expect(onSelectCategory).toHaveBeenCalledWith('cat-treaty')
  })

  it('선택 후 팝오버가 닫힌다', () => {
    renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '카테고리 필터' }))
    fireEvent.click(screen.getByRole('option', { name: '전쟁' }))

    expect(screen.queryByRole('option', { name: '전쟁' })).not.toBeInTheDocument()
  })

  it('바깥을 누르면 닫힌다', () => {
    renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '카테고리 필터' }))
    expect(screen.getByRole('option', { name: '전쟁' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('option', { name: '전쟁' })).not.toBeInTheDocument()
  })
})
