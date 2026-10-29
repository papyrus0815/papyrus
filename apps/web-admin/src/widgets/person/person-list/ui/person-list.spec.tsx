import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { act, fireEvent, screen, within } from '@testing-library/react'

import { ERAS, usePersonInfographicFilterStore, type AdaptedPerson } from '@/widgets/person-infographic'

import { useRecentPersonsStore } from '../model/recent-persons.store'
import { PersonList } from './person-list'

const mockPersons: AdaptedPerson[] = [
  {
    id: 'sejong',
    name: '세종',
    country: '조선',
    region: '아시아',
    field: '정치·군주',
    era: ERAS.find((e) => e.key === 'medieval')!,
    born: 1397,
    died: 1450,
    activityYear: 1434,
    isMonarch: true,
    isHeadOfState: false,
    isAlive: false,
    age: 53,
    influence: 95,
    primaryTitle: '제4대 국왕',
    faction: '전주 이씨',
    biography: '훈민정음 창제',
    profileImageUrl: null,
    searchText: '세종 sejong the great 조선 아시아 정치·군주 전주 이씨 제4대 국왕',
  },
  {
    id: 'taejong',
    name: '태종',
    country: '조선',
    region: '아시아',
    field: '정치·군주',
    era: ERAS.find((e) => e.key === 'medieval')!,
    born: 1367,
    died: 1422,
    activityYear: 1409,
    isMonarch: true,
    isHeadOfState: false,
    isAlive: false,
    age: 55,
    influence: 88,
    primaryTitle: '제3대 국왕',
    faction: '전주 이씨',
    biography: '왕권 강화',
    profileImageUrl: null,
    searchText: '태종 taejong of joseon 조선 아시아 정치·군주 전주 이씨 제3대 국왕',
  },
  {
    id: 'newton',
    name: '아이작 뉴턴',
    country: '영국',
    region: '유럽',
    field: '과학',
    era: ERAS.find((e) => e.key === 'early')!,
    born: 1643,
    died: 1727,
    activityYear: 1685,
    isMonarch: false,
    isHeadOfState: false,
    isAlive: false,
    age: 84,
    influence: 98,
    primaryTitle: '물리학자·수학자',
    faction: '',
    biography: '만유인력 법칙',
    profileImageUrl: null,
    searchText: '아이작 뉴턴 isaac newton 영국 유럽 과학·의학 물리학자·수학자',
  },
]

jest.mock('@/widgets/content-shell', () =>
  jest.requireActual('@/widgets/content-shell/ui/sidebar-header'),
)

jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))

jest.mock('@/entities/person/api', () => ({
  usePersonsInfographic: () => ({
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))

jest.mock('@/widgets/person-infographic', () => ({
  ...jest.requireActual('@/widgets/person-infographic/model/constants'),
  ...jest.requireActual('@/widgets/person-infographic/model/adapt'),
  ...jest.requireActual('@/widgets/person-infographic/model/century'),
  ...jest.requireActual('@/widgets/person-infographic/model/filter.store'),
  ...jest.requireActual('@/widgets/person-infographic/model/filter-persons'),
  ...jest.requireActual(
    '@/widgets/person-infographic/model/use-person-query-input',
  ),
  ...jest.requireActual('@/widgets/person-infographic/model/sort-helpers'),
  useAdaptedPersons: () => mockPersons,
}))

describe('PersonList sidebar search & context filters', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    if (typeof CSS === 'undefined' || !CSS.escape) {
      Object.defineProperty(globalThis, 'CSS', {
        value: { escape: (s: string) => s },
        configurable: true,
      })
    }
    Element.prototype.scrollIntoView = jest.fn()
    act(() => {
      usePersonInfographicFilterStore.getState().resetFilters()
      usePersonInfographicFilterStore.getState().setMany({ pinned: [] })
      useRecentPersonsStore.setState({ recentIds: ['sejong', 'taejong'] })
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('현재 선택된 인물(selectedId)은 상단 "최근" 빠른 접근 그룹에서 중복 표시되지 않는다', () => {
    renderWithTheme(
      <PersonList
        selectedId="sejong"
        onSelect={jest.fn()}
        onAdd={jest.fn()}
        onOpenAdvancedFilters={jest.fn()}
      />,
    )

    // 세종은 본인의 시대 그룹에만 1회 나타나고, 최근 그룹에는 태종만 나타난다
    expect(screen.getAllByText('세종')).toHaveLength(1)
    expect(screen.getByText('최근')).toBeInTheDocument()
  })

  it('검색창에서 "/" 단축키로 포커스되고, 검색어 하이라이트와 Enter 첫 결과 이동·Escape 초기화가 동작한다', () => {
    const onSelect = jest.fn()
    renderWithTheme(
      <PersonList
        selectedId="sejong"
        onSelect={onSelect}
        onAdd={jest.fn()}
        onOpenAdvancedFilters={jest.fn()}
      />,
    )

    const searchInput = screen.getByPlaceholderText('이름·국가·왕조·직함 검색...')
    expect(searchInput).not.toHaveFocus()

    // 전역 '/' 단축키로 검색창 포커스
    fireEvent.keyDown(window, { key: '/' })
    expect(searchInput).toHaveFocus()

    // 왕조('전주 이씨')로 검색 시 2행 메타에 왕조가 노출되고 <mark>로 하이라이트된다
    fireEvent.change(searchInput, { target: { value: '전주 이씨' } })
    act(() => {
      jest.advanceTimersByTime(250)
    })

    const marks = document.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThanOrEqual(2)
    expect(marks[0]).toHaveTextContent('전주 이씨')

    // 검색창에서 Enter 키를 누르면 첫 번째 검색 결과(영향력 순 첫 번째 = 세종)가 즉시 선택된다
    fireEvent.keyDown(searchInput, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('sejong')

    // 검색창에서 Escape 키를 누르면 검색어가 초기화된다
    fireEvent.keyDown(searchInput, { key: 'Escape' })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(searchInput).toHaveValue('')
  })

  it('현재 선택된 인물 기준 "같은 국가" / "같은 왕조" 1클릭 컨텍스트 칩과 상세 필터 해제 칩이 동작한다', () => {
    renderWithTheme(
      <PersonList
        selectedId="sejong"
        onSelect={jest.fn()}
        onAdd={jest.fn()}
        onOpenAdvancedFilters={jest.fn()}
      />,
    )

    const sameCountryBtn = screen.getByRole('button', { name: '같은 국가: 조선' })
    const sameDynastyBtn = screen.getByRole('button', { name: '같은 왕조: 전주 이씨' })

    expect(sameCountryBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(sameCountryBtn)
    expect(sameCountryBtn).toHaveAttribute('aria-pressed', 'true')
    expect(usePersonInfographicFilterStore.getState().scopes.country).toEqual(['조선'])

    // 뉴턴(영국)은 목록에서 제외된다
    expect(screen.queryByText('아이작 뉴턴')).not.toBeInTheDocument()

    // 상세 필터(분야, 최소 영향력)가 켜지면 개별 해제 칩(×)이 렌더링되고 클릭 시 해제된다
    act(() => {
      usePersonInfographicFilterStore.getState().setMinInfluence(90)
    })
    const influenceChip = screen.getByTitle('최소 영향력 필터 해제')
    expect(within(influenceChip).getByText(/영향력 90\+/)).toBeInTheDocument()
    fireEvent.click(influenceChip)
    expect(usePersonInfographicFilterStore.getState().minInfluence).toBe(0)

    // 같은 왕조 칩 클릭 시 검색어가 왕조명으로 설정된다
    fireEvent.click(sameDynastyBtn)
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(usePersonInfographicFilterStore.getState().query).toBe('전주 이씨')
  })

  it('시대·지역 드롭다운 옵션에 실시간 패싯 카운트(N)가 표시된다', () => {
    renderWithTheme(
      <PersonList
        selectedId="sejong"
        onSelect={jest.fn()}
        onAdd={jest.fn()}
        onOpenAdvancedFilters={jest.fn()}
      />,
    )

    expect(
      screen.getByRole('option', { name: '중세 (2)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: '근세 (1)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: '아시아 (2)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: '유럽 (1)' }),
    ).toBeInTheDocument()
  })
})
