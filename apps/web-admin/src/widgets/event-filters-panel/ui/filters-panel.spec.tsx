import '@testing-library/jest-dom'

import { fireEvent, screen, within } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import { FILTER_ALL } from '@/features/event-list/lib'

import { FiltersPanel } from './filters-panel'

/**
 * 필터 팝오버 회귀 가드.
 *
 * ## 1차(2026-07-28 검토 P1-1) — 포털 계약
 * 팝오버는 `FilterGroup`(height 34px + overflow:hidden) 안에서 absolute로 그려지던
 * 시절 화면에 전혀 나타나지 않았다 — 클리핑 조상이 컨테이닝 블록 체인에 있어
 * z-index로는 벗어날 수 없었다. 지금은 body로 포털한다.
 *
 * jsdom은 레이아웃을 계산하지 않아 '잘렸는지'를 직접 볼 수 없다. 대신 포털 전환이
 * 반드시 지켜야 하는 두 계약을 고정한다:
 *  1) 열면 옵션이 FilterGroup 밖(document.body 직속)에 렌더된다 = 클리핑 조상 이탈
 *  2) 옵션 클릭이 onSelect까지 도달한다 — 외부클릭 감지가 포털 노드를 "바깥"으로
 *     오판하면 mousedown 단계에서 언마운트돼 click이 영영 발화하지 않는다.
 *
 * ## 2차(필터 검토 배치 1) — combobox 조작 모델
 * 포털을 유지한 채로는 DOM 인접성이 없어 키보드/SR 도달 경로가 없다. APG combobox로
 * 재작성하면서 아래를 고정한다 — 반쪽 수정(포커스만·화살표만)으로 되돌아가면 여기서 깨진다:
 *  3) ↑↓·Home·End가 `aria-activedescendant`를 옮긴다 (INT-2/A11Y-1)
 *  4) Enter가 활성 옵션을 확정한다 (INT-13/A11Y-9)
 *  5) Esc가 닫으면서 포커스를 트리거로 되돌린다 (INT-3/A11Y-5), 검색 중이면 1회차는
 *     검색어만 지운다 (INT-12)
 *  6) 타입어헤드가 활성 옵션을 옮긴다
 *  7) 접근 이름이 시각 텍스트로 구성된다 — '카테고리: 전쟁' (INT-8/A11Y-4)
 *  8) 옵션은 탭 정지점이 아니고, 절단은 `aria-setsize`로 고지된다 (A11Y-8)
 *  9) '전체 보기 →'는 모달을 열기 전에 트리거로 포커스를 되돌린다 (INT-4)
 * 10) 팝오버를 닫는 바깥 클릭이 뒤 요소로 통과하지 않는다 (INT-14)
 *
 * ## 3차(필터 검토 배치 5) — 시각 계약
 * 11) 트리거 라벨은 `필드명 · 값` 2요소다 — 값이 필드명을 치환하지 않는다 (VIS-4)
 * 12) 활성 트리거는 `data-active`를 내보낸다 — CSS 활성 표시가 이걸 소비한다 (IA-8/VIS-3)
 * 13) 세기 축도 같은 팝오버 규약을 쓴다 — 네이티브 select 아님 (IA-15)
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

/** 카테고리 트리거 — 접근 이름은 시각 텍스트('카테고리')로 구성된다 */
const categoryTrigger = () => screen.getByRole('combobox', { name: '카테고리' })

const openCategoryPopover = () => {
  const trigger = categoryTrigger()
  fireEvent.click(trigger)
  return trigger
}

/**
 * 팝오버 옵션만 골라낸다.
 * 4축 전부 같은 팝오버 규약이라 열려 있는 listbox는 한 번에 하나뿐이지만,
 * '전체'처럼 축 사이에 이름이 겹치는 옵션이 있어 스코프를 명시한다.
 */
const popoverOptions = () => within(screen.getByRole('listbox')).getAllByRole('option')
const popoverOption = (name: string) =>
  within(screen.getByRole('listbox')).getByRole('option', { name })

describe('FiltersPanel — 카테고리 인라인 팝오버', () => {
  it('트리거를 누르면 옵션이 FilterGroup 밖(포털)에 렌더된다', () => {
    const { container } = renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
    )

    expect(screen.queryByRole('option', { name: '전쟁' })).not.toBeInTheDocument()

    openCategoryPopover()

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

    openCategoryPopover()
    const option = screen.getByRole('option', { name: '조약' })

    // 실제 포인터 순서를 재현 — mousedown이 먼저 온다. 외부클릭 핸들러가 여기서
    // 팝오버를 닫아버리면 아래 click은 사라진 노드에 떨어져 아무 일도 안 일어난다.
    fireEvent.mouseDown(option)
    expect(option).toBeInTheDocument()

    fireEvent.click(option)
    expect(onSelectCategory).toHaveBeenCalledWith('cat-treaty')
  })

  it('선택 후 팝오버가 닫힌다', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    openCategoryPopover()
    fireEvent.click(screen.getByRole('option', { name: '전쟁' }))

    expect(screen.queryByRole('option', { name: '전쟁' })).not.toBeInTheDocument()
  })

  it('바깥을 누르면 닫힌다', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    openCategoryPopover()
    expect(screen.getByRole('option', { name: '전쟁' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('option', { name: '전쟁' })).not.toBeInTheDocument()
  })
})

describe('FiltersPanel — combobox 키보드 조작 (검토 배치 1)', () => {
  it('↓ 가 aria-activedescendant를 다음 옵션으로 옮긴다 (INT-2/A11Y-1)', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    const trigger = openCategoryPopover()
    // 열면 현재 선택('전체')이 활성 — 첫 Enter가 엉뚱한 값을 고르지 않게.
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      popoverOption('전체').id,
    )

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '전쟁' }).id,
    )

    fireEvent.keyDown(trigger, { key: 'End' })
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '조약' }).id,
    )

    // 끝에서 감싸지 않는다(clamp)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '조약' }).id,
    )
  })

  it('Enter가 활성 옵션을 확정하고 닫는다 (INT-13/A11Y-9)', () => {
    const onSelectCategory = jest.fn()
    renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={onSelectCategory} />,
    )

    const trigger = openCategoryPopover()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(onSelectCategory).toHaveBeenCalledWith('cat-war')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('Esc가 닫으면서 포커스를 트리거로 되돌린다 (INT-3/A11Y-5)', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    const trigger = openCategoryPopover()
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('타입어헤드가 접두 일치 옵션을 활성으로 만든다', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    const trigger = openCategoryPopover()
    fireEvent.keyDown(trigger, { key: '조' })

    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '조약' }).id,
    )
  })

  it('닫힌 상태의 ↓ 는 팝오버를 연다', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    const trigger = categoryTrigger()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })
})

describe('FiltersPanel — ARIA 계약 (검토 배치 1)', () => {
  it('접근 이름이 시각 텍스트로 구성된다 — 값이 걸리면 축이 앞에 붙는다 (INT-8/A11Y-4)', () => {
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        selectedCategory="cat-war"
        onSelectCategory={jest.fn()}
      />,
    )

    // 예전엔 aria-label="카테고리 필터"가 고정으로 붙어 시각 텍스트('전쟁')를 덮었다.
    // 지금은 축 이름도 **시각 텍스트**라 접근 이름이 둘의 결합이다(검토 VIS-4).
    expect(
      screen.getByRole('combobox', { name: '카테고리 전쟁' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: '카테고리 필터' }),
    ).not.toBeInTheDocument()
  })

  it('옵션은 탭 정지점이 아니며 listbox에는 옵션만 들어간다 (INT-2 · INT-13)', () => {
    renderWithTheme(<FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />)

    const trigger = openCategoryPopover()
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)

    const option = screen.getByRole('option', { name: '전쟁' })
    expect(option.tagName).toBe('DIV')
    expect(option).not.toHaveAttribute('tabindex')

    // 검색행·상태행·푸터는 listbox 밖 형제 — 예전엔 전부 무효 자식이었다.
    const listbox = screen.getByRole('listbox')
    expect(within(listbox).queryByRole('button')).toBeNull()
    expect(within(listbox).queryByRole('combobox')).toBeNull()
  })

  it('섹션별 절단이 aria-setsize와 푸터 수치로 고지된다 (A11Y-8 · IA-2)', () => {
    const countries = Array.from({ length: 55 }, (_, index) => ({
      id: `country-${index}`,
      name: `국가${String(index).padStart(2, '0')}`,
    })) as never[]

    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={countries}
        onSelectCountry={jest.fn()}
      />,
    )

    // 국가 축은 searchable — 트리거는 combobox가 아니라 팝업 버튼이다(입력이 combobox).
    fireEvent.click(screen.getByRole('button', { name: '국가' }))

    // '전체'(무제목) + 현대 국가 20 + '35개 더 보기' = 22행
    const options = popoverOptions()
    expect(options).toHaveLength(22)
    // setsize는 **그 섹션의** 전체 수다 — 섹션마다 상한이 따로라 전역 합계는 거짓말이 된다.
    expect(options[1]).toHaveAttribute('aria-setsize', '55')
    expect(options[1]).toHaveAttribute('aria-posinset', '1')
    expect(screen.getByText('전체 56개 중 21개 표시')).toBeInTheDocument()
  })

  it('절단 창 밖 선택도 자기 섹션 맨 앞에 고정된다 (INT-5)', () => {
    /**
     * 예전엔 앞 50개 창 밖 선택이 팝오버에 **아예 렌더되지 않아** 체크가 하나도 없었다
     * (지금 무엇이 걸려 있는지 확인할 수도, 그 자리에서 해제할 수도 없다).
     * 지금은 선택을 자기 섹션 맨 앞으로 끌어올리므로 절단과 무관하게 항상 보인다.
     */
    const countries = Array.from({ length: 55 }, (_, index) => ({
      id: `country-${index}`,
      name: `국가${String(index).padStart(2, '0')}`,
    })) as never[]

    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={countries}
        selectedCountry="country-54"
        onSelectCountry={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '국가 국가54' }))

    const selectedOption = popoverOption('국가54')
    expect(selectedOption).toHaveAttribute('aria-selected', 'true')
    // 무제목 구역의 '전체' 바로 다음 = 자기 섹션의 첫 행
    expect(popoverOptions()[1]).toBe(selectedOption)

    const searchInput = screen.getByRole('combobox', { name: '국가 검색' })
    const activeId = searchInput.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(document.getElementById(activeId as string)).toBe(selectedOption)
  })
})

describe('FiltersPanel — 옵션 모집단 (검토 배치 7)', () => {
  const modernCountries = Array.from({ length: 25 }, (_, index) => ({
    id: `modern-${index}`,
    name: `현대국가${String(index).padStart(2, '0')}`,
    continentId: index < 10 ? 'continent-eu' : 'continent-as',
  })) as never[]
  const historicalCountries = Array.from({ length: 30 }, (_, index) => ({
    id: `historical-${index}`,
    name: `역사국가${String(index).padStart(2, '0')}`,
  })) as never[]

  const openCountryPopover = () =>
    fireEvent.click(screen.getByRole('button', { name: '국가' }))

  it('현대/역사가 별도 섹션이라 첫 화면에 역사국가가 반드시 있다 (IA-2)', () => {
    /**
     * 예전엔 한 목록·한 상한(50)이라 현대 70개가 슬롯을 전부 소진해 **첫 화면의
     * 역사국가가 구조적으로 0개**였다. 역사 카탈로그에서 엔티티 한 클래스의 전면 부재다.
     */
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={modernCountries}
        historicalCountries={historicalCountries}
        onSelectCountry={jest.fn()}
      />,
    )

    openCountryPopover()

    const listbox = screen.getByRole('listbox')
    const groups = within(listbox).getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAttribute('aria-label', '현대 국가')
    expect(groups[1]).toHaveAttribute('aria-label', '역사 국가')
    // 역사 섹션은 자기 상한(20)을 갖는다 — 현대가 먼저 다 먹지 않는다.
    expect(within(groups[1]).getAllByRole('option')).toHaveLength(21)
  })

  it("'N개 더 보기'가 그 섹션만 펼친다", () => {
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={modernCountries}
        historicalCountries={historicalCountries}
        onSelectCountry={jest.fn()}
      />,
    )

    openCountryPopover()
    const listbox = screen.getByRole('listbox')
    const historicalGroup = within(listbox).getAllByRole('group')[1]
    // 30개 중 20개 표시 → 10개가 남는다
    fireEvent.click(within(historicalGroup).getByRole('option', { name: '10개 더 보기' }))

    const expanded = within(screen.getByRole('listbox')).getAllByRole('group')[1]
    expect(within(expanded).getAllByRole('option')).toHaveLength(30)
    // 현대 섹션은 그대로 접혀 있다 — 20 + '더 보기' 1행
    const modernGroup = within(screen.getByRole('listbox')).getAllByRole('group')[0]
    expect(within(modernGroup).getAllByRole('option')).toHaveLength(21)
  })

  it('검색 중에도 상한이 걸린다 (PERF-9)', () => {
    /**
     * 예전엔 검색 중에는 상한이 **풀려** 조건에 맞는 옵션이 통째로 DOM에 들어갔다
     * (실데이터 334개, 가상화 없음).
     */
    const manyCountries = Array.from({ length: 140 }, (_, index) => ({
      id: `modern-${index}`,
      name: `공통국가${String(index).padStart(3, '0')}`,
    })) as never[]

    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={manyCountries}
        onSelectCountry={jest.fn()}
      />,
    )

    openCountryPopover()
    fireEvent.change(screen.getByRole('combobox', { name: '국가 검색' }), {
      target: { value: '공통국가' },
    })

    expect(popoverOptions()).toHaveLength(100)
    expect(
      screen.getByText('조건에 맞는 140개 중 100개 표시'),
    ).toBeInTheDocument()
  })

  it('대륙이 걸리면 국가 옵션이 그 대륙으로 좁혀지고 해제 액션이 붙는다 (IA-1)', () => {
    const onSelectContinent = jest.fn()
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={modernCountries}
        historicalCountries={historicalCountries}
        continents={[{ id: 'continent-eu', name: '유럽' }] as never[]}
        selectedContinent="continent-eu"
        onSelectContinent={onSelectContinent}
        onSelectCountry={jest.fn()}
      />,
    )

    openCountryPopover()

    const groups = within(screen.getByRole('listbox')).getAllByRole('group')
    // 유럽 소속 10개만 남는다(상한 20 미만이라 '더 보기' 행 없음)
    expect(groups[0]).toHaveAttribute('aria-label', '현대 국가 · 유럽')
    expect(within(groups[0]).getAllByRole('option')).toHaveLength(10)
    // 역사국가는 continentId가 없다 — 빼면 그 클래스가 또 통째로 사라지므로 존치한다.
    expect(groups[1]).toHaveAttribute('aria-label', '역사 국가 (대륙 미상)')

    fireEvent.click(screen.getByRole('button', { name: '대륙 필터 해제' }))
    expect(onSelectContinent).toHaveBeenCalledWith('all')
  })

  it('옵션 우측에 건수가 붙는다 — 로드된 사건이 있을 때만 (IA-13)', () => {
    const optionCounts = {
      category: new Map([['cat-war', 12]]),
      country: new Map<string, number>(),
      continent: new Map<string, number>(),
      century: new Map<number, number>(),
      centuryUnknown: 0,
      dropOneOut: {
        category: 30,
        country: 30,
        continent: 30,
        century: 30,
        keyword: 30,
        bookmark: 30,
      },
      unfiltered: 30,
    }

    const { rerender } = renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
    )
    // 로드 전(사건 0건)에는 숫자를 내지 않는다 — 전부 '0'은 정보가 아니라 거짓 단정이다.
    openCategoryPopover()
    expect(popoverOption('전쟁')).toBeInTheDocument()
    fireEvent.keyDown(categoryTrigger(), { key: 'Escape' })

    rerender(
      <FiltersPanel
        {...baseProps}
        optionCounts={optionCounts}
        onSelectCategory={jest.fn()}
      />,
    )
    openCategoryPopover()
    expect(popoverOption('전쟁 12')).toBeInTheDocument()
    expect(popoverOption('조약 0')).toBeInTheDocument()
  })
})

describe('FiltersPanel — 검색 변종(국가) (검토 배치 1)', () => {
  const countries = [
    { id: 'kr', name: '대한민국' },
    { id: 'jp', name: '일본' },
    { id: 'fr', name: '프랑스' },
  ] as never[]

  const openCountryPopover = () => {
    fireEvent.click(screen.getByRole('button', { name: '국가' }))
    return screen.getByRole('combobox', { name: '국가 검색' })
  }

  it('Esc 2단 규약 — 1회차는 검색어만 지우고 2회차에 닫힌다 (INT-12)', () => {
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={countries}
        onSelectCountry={jest.fn()}
      />,
    )

    const searchInput = openCountryPopover()
    fireEvent.change(searchInput, { target: { value: '일본' } })
    expect(popoverOptions()).toHaveLength(1)

    fireEvent.keyDown(searchInput, { key: 'Escape' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '국가 검색' })).toHaveValue('')

    fireEvent.keyDown(screen.getByRole('combobox', { name: '국가 검색' }), {
      key: 'Escape',
    })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '국가' })).toHaveFocus()
  })

  it('검색 후 Enter가 첫 결과를 확정한다', () => {
    const onSelectCountry = jest.fn()
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        countries={countries}
        onSelectCountry={onSelectCountry}
      />,
    )

    const searchInput = openCountryPopover()
    fireEvent.change(searchInput, { target: { value: '프랑' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(onSelectCountry).toHaveBeenCalledWith('fr')
  })
})

describe('FiltersPanel — 닫기 경로 (검토 배치 1)', () => {
  it("'전체 보기 →'는 모달을 열기 전에 트리거로 포커스를 되돌린다 (INT-4)", () => {
    const onShowCategoryModal = jest.fn(() => {
      // 모달이 마운트되는 시점의 activeElement가 곧 복원 대상이다.
      expect(document.activeElement).toBe(categoryTrigger())
    })
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        onSelectCategory={jest.fn()}
        onShowCategoryModal={onShowCategoryModal}
      />,
    )

    openCategoryPopover()
    fireEvent.click(screen.getByRole('button', { name: '전체 보기 →' }))

    expect(onShowCategoryModal).toHaveBeenCalledTimes(1)
  })

  it('닫는 바깥 클릭이 뒤 요소로 통과하지 않는다 (INT-14)', () => {
    const onBehindClick = jest.fn()
    renderWithTheme(
      <>
        <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />
        <button type="button" onClick={onBehindClick}>
          뒤에 있는 행
        </button>
      </>,
    )

    openCategoryPopover()

    const behind = screen.getByRole('button', { name: '뒤에 있는 행' })
    // 실제 포인터 순서: mousedown이 팝오버를 닫고, 그 다음 click이 뒤 요소에 떨어진다.
    fireEvent.mouseDown(behind)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    fireEvent.click(behind)
    expect(onBehindClick).not.toHaveBeenCalled()
  })

  it('팝오버 안 버튼에서 누른 Esc도 닫고 트리거로 복귀한다', () => {
    /**
     * '다시 시도'·'전체 보기 →'에는 자기 키 핸들러가 없다. 그 위에서 누른 Esc는
     * document 안전망까지 갔다가 "포커스가 위젯 안 = 이미 소비됨"으로 판정돼
     * **아무 일도 일어나지 않는** 막다른 골목이었다(전파도 이미 끊겨 페이지 Esc로도
     * 안 넘어간다). 팝오버 컨테이너가 같은 2단 규약으로 받는다.
     */
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        onSelectCategory={jest.fn()}
        referenceState={{
          category: 'error',
          country: 'ready',
          continent: 'ready',
        }}
        onRetryReference={jest.fn()}
      />,
    )

    const trigger = openCategoryPopover()
    const retry = screen.getByRole('button', { name: '다시 시도' })
    retry.focus()
    fireEvent.keyDown(retry, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('세기 축도 같은 팝오버 규약을 쓴다 — 네이티브 select 아님 (IA-15)', () => {
    /**
     * 예전엔 세기만 네이티브 `<select>`였다. 그래서 미적용일 때 표시가 '전체'가 되어
     * **축 이름이 화면에서 사라졌고**(무슨 필터인지 알 수 없다) 조작 감각도 옆 3축과 달랐다.
     */
    const onSelectCentury = jest.fn()
    renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCentury={onSelectCentury} />,
    )

    const trigger = screen.getByRole('combobox', { name: '세기' })
    fireEvent.click(trigger)

    // '연도 미상'은 목록의 1급 섹션이라 세기 축 옵션에도 있어야 한다(검토 IA-5).
    expect(popoverOption('연도 미상')).toBeInTheDocument()

    fireEvent.click(popoverOption('20세기'))
    expect(onSelectCentury).toHaveBeenCalledWith(20)
  })

  it('타입어헤드 키가 페이지 단축키 핸들러로 새지 않는다', () => {
    // '/'는 페이지의 window 핸들러에서 목록 검색창 포커스다. 전파를 끊지 않으면
    // 팝오버는 열린 채 포커스만 툴바 밖으로 끌려간다.
    const pageShortcut = jest.fn()
    window.addEventListener('keydown', pageShortcut)
    try {
      renderWithTheme(
        <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
      )
      const trigger = openCategoryPopover()
      fireEvent.keyDown(trigger, { key: '/' })

      expect(pageShortcut).not.toHaveBeenCalled()
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    } finally {
      window.removeEventListener('keydown', pageShortcut)
    }
  })

  it('다른 필터 트리거로는 한 번의 클릭으로 갈아탄다 — 삼킴의 예외 (INT-14)', () => {
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        onSelectCategory={jest.fn()}
        onSelectContinent={jest.fn()}
      />,
    )

    openCategoryPopover()

    const continentTrigger = screen.getByRole('combobox', { name: '대륙' })
    fireEvent.mouseDown(continentTrigger)
    fireEvent.click(continentTrigger)

    expect(continentTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox', { name: '대륙 옵션' })).toBeInTheDocument()
  })
})

describe('FiltersPanel — 트리거 시각 계약 (검토 배치 5)', () => {
  it('라벨이 `필드명 · 값` 2요소다 — 값이 필드명을 치환하지 않는다 (VIS-4)', () => {
    /**
     * 예전엔 값이 필드명을 통째로 치환했다. 그 결과 ⑴ 긴 국가명 하나로 트리거 폭이
     * ≈80 → ≈210px가 되어 오른쪽 컨트롤이 전부 밀리고 ⑵ 값이 걸린 축은 이름이
     * 화면에서 사라졌다. 두 슬롯이 따로 있어야 폭도 의미도 고정된다.
     */
    const { rerender } = renderWithTheme(
      <FiltersPanel {...baseProps} onSelectCategory={jest.fn()} />,
    )

    // 미적용 — 필드명만.
    const idle = screen.getByRole('combobox', { name: '카테고리' })
    expect(idle).toHaveTextContent('카테고리')
    expect(idle).not.toHaveAttribute('data-active')

    rerender(
      <FiltersPanel
        {...baseProps}
        selectedCategory="cat-war"
        onSelectCategory={jest.fn()}
      />,
    )

    const active = screen.getByRole('combobox', { name: '카테고리 전쟁' })
    // 필드명이 남아 있고(치환 아님), 값은 별도 슬롯에 있다.
    expect(active).toHaveTextContent('카테고리')
    expect(active).toHaveTextContent('전쟁')
  })

  it('활성 트리거가 data-active를 내보낸다 — 활성 표시 CSS의 유일한 훅 (IA-8/VIS-3)', () => {
    /**
     * 이 속성은 예전에도 나왔지만 **소비하는 CSS가 레포에 0개**여서, 활성/비활성의
     * 유일한 차이가 라벨 문자열이었다. 이제 굵기·좌측 인디케이터·색 3중 인코딩이
     * 전부 이 속성 하나에 매달려 있다 — 속성이 사라지면 표시도 통째로 사라진다.
     */
    renderWithTheme(
      <FiltersPanel
        {...baseProps}
        selectedContinent="continent-eu"
        continents={[{ id: 'continent-eu', name: '유럽' }] as never[]}
        onSelectContinent={jest.fn()}
      />,
    )

    expect(screen.getByRole('combobox', { name: '대륙 유럽' })).toHaveAttribute(
      'data-active',
      'true',
    )
    expect(screen.getByRole('combobox', { name: '카테고리' })).not.toHaveAttribute(
      'data-active',
    )
  })
})
