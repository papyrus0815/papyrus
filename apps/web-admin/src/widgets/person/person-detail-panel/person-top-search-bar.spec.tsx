import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { act, fireEvent, screen } from '@testing-library/react'

import {
  ERAS,
  usePersonInfographicFilterStore,
  type AdaptedPerson,
} from '@/widgets/person-infographic'
import { useRecentPersonsStore } from '@/widgets/person/person-list/model/recent-persons.store'

import { PersonTopSearchBar } from './person-top-search-bar'

const mockPersons: AdaptedPerson[] = [
  {
    id: 'taejong',
    name: '태종',
    nameEn: 'Taejong of Joseon',
    country: '조선',
    countryId: 'joseon',
    isoCode: null,
    region: '동아시아',
    field: '정치',
    fieldColor: '#6366f1',
    era: ERAS.find((e) => e.key === 'medieval')!,
    year: 1367,
    birthYear: 1367,
    deathYear: 1422,
    reignStartYear: 1400,
    reignEndYear: 1418,
    isMonarch: true,
    isHeadOfState: false,
    isAlive: false,
    age: 55,
    influence: 88,
    primaryTitle: '제3대 국왕',
    faction: '전주 이씨',
    summary: '왕권 강화',
    achievementSummary: null,
    keyAchievements: [],
    tags: [],
    titles: [],
    tenures: [],
    profileImageUrl: null,
    fatherId: null,
    motherId: null,
    spouseIds: [],
    siblingIds: [],
    searchText: '태종 taejong of joseon 조선 동아시아 정치 전주 이씨 제3대 국왕',
  },
  {
    id: 'sejong',
    name: '세종',
    nameEn: 'Sejong the Great',
    country: '조선',
    countryId: 'joseon',
    isoCode: null,
    region: '동아시아',
    field: '정치',
    fieldColor: '#6366f1',
    era: ERAS.find((e) => e.key === 'medieval')!,
    year: 1397,
    birthYear: 1397,
    deathYear: 1450,
    reignStartYear: 1418,
    reignEndYear: 1450,
    isMonarch: true,
    isHeadOfState: false,
    isAlive: false,
    age: 53,
    influence: 95,
    primaryTitle: '제4대 국왕',
    faction: '전주 이씨',
    summary: '훈민정음 창제',
    achievementSummary: null,
    keyAchievements: [],
    tags: [],
    titles: [],
    tenures: [],
    profileImageUrl: null,
    fatherId: 'taejong',
    motherId: null,
    spouseIds: [],
    siblingIds: [],
    searchText: '세종 sejong the great 조선 동아시아 정치 전주 이씨 제4대 국왕',
  },
  {
    id: 'newton',
    name: '아이작 뉴턴',
    nameEn: 'Isaac Newton',
    country: '영국',
    countryId: 'uk',
    isoCode: 'GB',
    region: '유럽',
    field: '과학',
    fieldColor: '#0ea5e9',
    era: ERAS.find((e) => e.key === 'early')!,
    year: 1643,
    birthYear: 1643,
    deathYear: 1727,
    reignStartYear: null,
    reignEndYear: null,
    isMonarch: false,
    isHeadOfState: false,
    isAlive: false,
    age: 84,
    influence: 98,
    primaryTitle: '물리학자·수학자',
    faction: null,
    summary: '만유인력 법칙',
    achievementSummary: null,
    keyAchievements: [],
    tags: [],
    titles: [],
    tenures: [],
    profileImageUrl: null,
    fatherId: null,
    motherId: null,
    spouseIds: [],
    siblingIds: [],
    searchText: '아이작 뉴턴 isaac newton 영국 유럽 과학 물리학자·수학자',
  },
]

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
  ...jest.requireActual('@/widgets/person-infographic/model/sort-helpers'),
  useAdaptedPersons: () => mockPersons,
}))

describe('PersonTopSearchBar', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn()
    act(() => {
      usePersonInfographicFilterStore.getState().resetFilters()
      usePersonInfographicFilterStore.getState().setMany({ pinned: ['newton'] })
      useRecentPersonsStore.setState({ recentIds: ['sejong', 'taejong'] })
    })
  })

  it('포커스/단축키("/") 시 팝오버가 열리고 고정 인물·최근 본 인물(현재 인물 제외)·맥락 칩을 표시한다', () => {
    renderWithTheme(
      <PersonTopSearchBar
        currentPersonId="sejong"
        onSelectPerson={jest.fn()}
      />,
    )

    const input = screen.getByRole('combobox', { name: '인물 빠른 검색' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    // 전역 '/' 단축키로 포커스 및 팝오버 오픈
    fireEvent.keyDown(window, { key: '/' })
    expect(input).toHaveFocus()
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // 맥락 필터 칩 노출 확인
    expect(
      screen.getByRole('button', { name: '같은 왕조: 전주 이씨 (2)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '같은 국가: 조선 (2)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '같은 시대: 중세 (2)' }),
    ).toBeInTheDocument()

    // 고정 인물(아이작 뉴턴), 최근 본 인물(태종) 섹션 노출 및 현재 인물(세종) 중복 제외 확인
    expect(screen.getByText('고정 인물')).toBeInTheDocument()
    expect(screen.getByText('최근 본 인물')).toBeInTheDocument()
    expect(screen.getByText('아이작 뉴턴')).toBeInTheDocument()
    expect(screen.queryByText('세종')).not.toBeInTheDocument()
  })

  it('검색어 입력 시 하이라이트(<mark>)와 화살표·Enter 키보드 선택, Escape 닫기가 동작한다', () => {
    const onSelectPerson = jest.fn()
    renderWithTheme(
      <PersonTopSearchBar
        currentPersonId="sejong"
        onSelectPerson={onSelectPerson}
      />,
    )

    const input = screen.getByRole('combobox', { name: '인물 빠른 검색' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '뉴턴' } })

    const marks = document.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThanOrEqual(1)
    expect(marks[0]).toHaveTextContent('뉴턴')

    // Enter 키로 첫 번째 매칭 결과(newton) 선택
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelectPerson).toHaveBeenCalledWith('newton')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('상단 이전/다음 인물 스테퍼(◀/▶)로 같은 왕조 인물을 순서대로 이동할 수 있다', () => {
    const onSelectPerson = jest.fn()
    renderWithTheme(
      <PersonTopSearchBar
        currentPersonId="sejong"
        onSelectPerson={onSelectPerson}
      />,
    )

    // 전주 이씨: 태종(1367, 1번째) → 세종(1397, 2번째)
    expect(screen.getByText('2/2')).toBeInTheDocument()
    const prevBtn = screen.getByRole('button', { name: '이전 인물' })
    const nextBtn = screen.getByRole('button', { name: '다음 인물' })

    expect(prevBtn).not.toBeDisabled()
    expect(nextBtn).toBeDisabled()

    fireEvent.click(prevBtn)
    expect(onSelectPerson).toHaveBeenCalledWith('taejong')
  })
})
