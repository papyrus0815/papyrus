import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { MilitaryUnitFormModal } from './military-unit-form.modal'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/shared/api/client', () => ({
  getApiConnection: () => ({ host: 'http://localhost:8000', headers: {} }),
  apiConnection: { host: 'http://localhost:8000', headers: {} },
}))

jest.mock('@/shared/api/api.service', () => ({}))

jest.mock('@/features/country/api/use-historical-countries-by-modern-country.hook', () => ({
  useHistoricalCountriesByModernCountry: () => ({ data: [] }),
}))

jest.mock('@/shared/api/countries', () => ({
  getAllCountries: jest.fn(async () => [
    { id: 'country-kr', name: '대한민국', flagEmoji: '🇰🇷' },
  ]),
}))

jest.mock('@/shared/api/historical-countries', () => ({
  getAllHistoricalCountries: jest.fn(async () => []),
}))

const linkDepartmentEventMock = jest.fn<Promise<Record<string, never>>, unknown[]>(
  async () => ({}),
)
jest.mock('@/shared/api/administration-department', () => ({
  administrationDepartmentApi: {
    getAll: jest.fn(async () => []),
    linkDepartmentEvent: (...args: unknown[]) => linkDepartmentEventMock(...args),
    updateDepartmentEventLink: jest.fn(),
    unlinkDepartmentEvent: jest.fn(),
  },
}))

jest.mock('@/entities/military-unit', () => ({
  fetchCountryScopedMilitaryUnits: jest.fn(async () => []),
  militaryUnitQueryKeys: { all: ['military-units'] },
  MILITARY_DIRECTIVE_ROLE_OPTIONS: [
    { value: 'ISSUER', label: '명령·지령 발령' },
    { value: 'PARTICIPANT', label: '관여' },
  ],
}))

const createObservationMock = jest.fn<Promise<{ id: string }>, unknown[]>(
  async () => ({ id: 'obs-1' }),
)
jest.mock('@/shared/api/evidence', () => ({
  createObservation: (...args: unknown[]) => createObservationMock(...args),
  updateObservation: jest.fn(),
  deleteObservation: jest.fn(),
}))

const addTenureMock = jest.fn<Promise<{ id: string }>, unknown[]>(async () => ({
  id: 'tenure-1',
}))
jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    addGovernmentPositionTenure: (...args: unknown[]) => addTenureMock(...args),
    updateGovernmentPositionTenure: jest.fn(),
    deleteGovernmentPositionTenure: jest.fn(),
  },
}))

jest.mock('@/shared/api/military-rank', () => ({
  MILITARY_RANK_CATEGORY_LABELS: {
    MARSHAL: '원수급',
    GENERAL: '장성급',
    FIELD_OFFICER: '영관급',
    COMPANY_OFFICER: '위관급',
    WARRANT: '준사관',
    NCO: '부사관',
    ENLISTED: '병',
    HISTORICAL_SPECIAL: '시대·특수 무관',
  },
  militaryRankApi: {
    list: jest.fn(async () => [
      {
        id: 'rank-brig-gen',
        name: '준장',
        nameLocal: null,
        nameEn: 'Brigadier General',
        abbreviation: null,
        category: 'GENERAL',
        branch: null,
        natoCode: 'OF-6',
        sortOrder: 40,
        isUniversal: true,
        countryId: null,
        historicalCountryId: null,
      },
    ]),
    createOrResolve: jest.fn(),
  },
}))

jest.mock('@/shared/api/persons', () => ({
  searchPersons: jest.fn(async () => [
    {
      id: 'person-1',
      name: '백선엽',
      surname: null,
      countryId: 'country-kr',
    },
  ]),
}))

jest.mock('@/shared/api/events', () => ({
  createEvent: jest.fn(async (dto: { title: string }) => ({
    id: 'event-created',
    title: dto.title,
  })),
  getEventLinkCandidates: jest.fn(async () => []),
}))

jest.mock('@/shared/api/place', () => ({
  placeApi: {
    resolve: jest.fn(async () => ({ id: 'place-paju', name: '파주 전진기지' })),
  },
}))

jest.mock('@/shared/ui/place-autocomplete/place-autocomplete', () => ({
  PlaceSelect: () => <div data-testid="garrison-place-select" />,
}))

const addEventSideUnitMock = jest.fn<Promise<unknown[]>, unknown[]>(
  async () => [],
)
jest.mock('@/shared/api/event-sides', () => ({
  listEventSides: jest.fn(async () => [
    {
      id: 'side-rok',
      name: '대한민국 국군·유엔군',
      participants: [{ countryId: 'country-kr', historicalCountryId: null }],
    },
  ]),
  syncEventSides: jest.fn(async () => []),
  addEventSideUnit: (...args: unknown[]) => addEventSideUnitMock(...args),
  updateEventSideUnit: jest.fn(),
  removeEventSideUnit: jest.fn(),
}))

jest.mock('@/shared/hooks/use-event-search', () => ({
  useEventSearch: () => ({
    query: '다부동',
    setQuery: jest.fn(),
    results: [
      {
        id: 'event-dabudong',
        title: '다부동 전투',
        startYear: 1950,
      },
    ],
    isSearching: false,
    isError: false,
    hasMore: false,
  }),
}))

jest.mock('@/shared/ui/headquarters-location-field', () => ({
  HeadquartersLocationField: ({
    headquarters,
    onChange,
  }: {
    headquarters: string
    onChange: (next: {
      headquarters: string
      headquartersLatitude: number | null
      headquartersLongitude: number | null
    }) => void
  }) => (
    <div data-testid="headquarters-location-field">
      <input
        aria-label="주둔지 · 사령부 본영 위치"
        value={headquarters}
        onChange={(e) =>
          onChange({
            headquarters: e.target.value,
            headquartersLatitude: 37.2792,
            headquartersLongitude: 127.4425,
          })
        }
      />
    </div>
  ),
}))

jest.mock('@/shared/ui/jurisdiction-map-field', () => ({
  JurisdictionMapField: ({
    onChange,
  }: {
    onChange: (next: {
      type: 'POLYGON'
      coordinates: Array<[number, number]>
    }) => void
  }) => (
    <div data-testid="jurisdiction-map-field">
      <button
        type="button"
        onClick={() =>
          onChange({
            type: 'POLYGON',
            coordinates: [
              [37.5, 127.0],
              [37.6, 127.5],
              [37.1, 127.4],
            ],
          })
        }
      >
        테스트 관할 다각형 지정
      </button>
    </div>
  ),
}))

const createMock = jest.fn(async (payload: { name: string }) => ({
  id: 'unit-new',
  name: payload.name,
}))

jest.mock('@/shared/api/military-unit', () => ({
  militaryUnitApi: {
    create: (payload: { name: string }) => createMock(payload),
    update: jest.fn(),
    getById: jest.fn(),
  },
}))

function renderModal(
  props: Partial<React.ComponentProps<typeof MilitaryUnitFormModal>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MilitaryUnitFormModal
          isOpen
          onClose={jest.fn()}
          defaultCountryId="country-kr"
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MilitaryUnitFormModal — 진화형 5섹션 · 정규화 계급 · 사건 통합 · 지도', () => {
  beforeEach(() => {
    createMock.mockClear()
    createObservationMock.mockClear()
    addTenureMock.mockClear()
    addEventSideUnitMock.mockClear()
    linkDepartmentEventMock.mockClear()
    window.localStorage.clear()
  })

  it('육군 등 군종 카드를 클릭하면 active(aria-checked="true") 상태가 유지되고 입력 중인 부대명이 초기화되지 않는다', () => {
    renderModal()

    const nameInput = screen.getByPlaceholderText(
      /합동참모본부/,
    ) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '제7기동군단' } })
    expect(nameInput.value).toBe('제7기동군단')

    const armyRadio = screen.getByRole('radio', { name: '육군' })
    expect(armyRadio).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(armyRadio)

    expect(armyRadio).toHaveAttribute('aria-checked', 'true')
    expect(nameInput.value).toBe('제7기동군단')
  })

  it('헤더에 진화된 5개 섹션 이동 알약과 2단/1단 전환이 표시된다', () => {
    renderModal()
    const nav = screen.getByRole('navigation', { name: '폼 섹션 이동' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기본 정보' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시기 · 위치 지도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '병력 · 전력' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '소속 · 인물 · 참전' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '임무 · 수훈 · 연혁' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '1단 세로 보기로 전환' }),
    ).toBeInTheDocument()
  })

  it('자유 텍스트 주요 참전 전투(notableBattles)는 제거되고 참전 사건 연결 및 병력·관할·임무·수훈·연혁 서술과 장소 정본 검색이 상시 노출된다', () => {
    renderModal()

    expect(screen.getByTestId('garrison-place-select')).toBeInTheDocument()
    expect(screen.getByTestId('headquarters-location-field')).toBeInTheDocument()
    expect(screen.getByTestId('jurisdiction-map-field')).toBeInTheDocument()

    // 레거시 텍스트 전투 필드는 완전히 제거됨
    expect(
      document.getElementById('military-unit-form-notable-battles'),
    ).toBeNull()

    for (const id of [
      'military-unit-form-strength',
      'military-unit-form-jurisdiction',
      'military-unit-form-primary-mission',
      'military-unit-form-honors',
      'military-unit-form-description',
    ]) {
      const el = document.getElementById(id)
      expect(el).not.toBeNull()
      expect(el?.tagName).toBe('TEXTAREA')
    }
  })

  it('이름이 비면 푸터가 빠진 필수 칸으로 안내하고 등록 버튼은 잠긴다', () => {
    renderModal()
    expect(screen.getByText('필수 입력: 부대·사령부명')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '부대 등록' })).toBeDisabled()
  })

  it('군종·병과·지도 좌표·정밀 병력·DB 계급 인물 연결·참전 사건을 함께 등록하고 정본 API들을 호출한다', async () => {
    renderModal()
    await screen.findAllByText('대한민국')

    // 1. 부대명 + 육군 선택 + 보병 병과 선택
    fireEvent.change(screen.getByPlaceholderText(/합동참모본부/), {
      target: { value: '제1보병사단' },
    })
    fireEvent.click(screen.getByRole('radio', { name: '육군' }))
    fireEvent.click(screen.getByRole('button', { name: '보병' }))

    // 2. 주둔지 핀 좌표 + 관할 다각형 + 관할 서술
    fireEvent.change(screen.getByLabelText('주둔지 · 사령부 본영 위치'), {
      target: { value: '파주 전진기지' },
    })
    fireEvent.click(screen.getByRole('button', { name: '테스트 관할 다각형 지정' }))
    fireEvent.change(
      document.getElementById('military-unit-form-jurisdiction')!,
      { target: { value: '서부전선 임진강 축선 방어\n개성 정면 경계' } },
    )

    // 3. 정량 병력 (장교·부사관·병 합계 버튼 검증 + 전차 수)
    fireEvent.change(screen.getByPlaceholderText('예: 518'), {
      target: { value: '500' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 2,573'), {
      target: { value: '2500' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 14,643'), {
      target: { value: '12000' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /계급 합계 15,000명 → 총병력 반영/ }),
    )
    fireEvent.change(screen.getByPlaceholderText('예: 196'), {
      target: { value: '45' },
    })

    // 4. 인물 빠른 검색 연결 + 정규화 군 계급(준장) 원클릭 선택
    const personSearch = screen.getByLabelText('연결할 인물 검색')
    fireEvent.focus(personSearch)
    fireEvent.change(personSearch, { target: { value: '백선엽' } })
    const personOption = await screen.findByRole('option', { name: /백선엽/ })
    fireEvent.mouseDown(personOption)

    const rankQuickChip = await screen.findByRole('button', { name: '준장' })
    fireEvent.click(rankQuickChip)

    // 5. 사건 빠른 검색 연결 (참전 트랙)
    const eventSearch = screen.getByLabelText('연결할 사건 검색')
    fireEvent.focus(eventSearch)
    fireEvent.change(eventSearch, { target: { value: '다부동' } })
    const eventOption = await screen.findByRole('option', { name: /다부동 전투/ })
    fireEvent.mouseDown(eventOption)
    await screen.findByRole('button', { name: '대한민국 국군·유엔군' })

    // 6. 저장 실행
    fireEvent.click(screen.getByRole('button', { name: '부대 등록' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toMatchObject({
      name: '제1보병사단',
      branch: 'ARMY',
      combatArm: 'INFANTRY',
      countryId: 'country-kr',
      garrison: '파주 전진기지',
      garrisonLatitude: 37.2792,
      garrisonLongitude: 127.4425,
      jurisdiction: '서부전선 임진강 축선 방어\n개성 정면 경계',
      jurisdictionGeometry: {
        type: 'POLYGON',
        coordinates: [
          [37.5, 127.0],
          [37.6, 127.5],
          [37.1, 127.4],
        ],
      },
      transitions: [],
    })

    await waitFor(() => expect(createObservationMock).toHaveBeenCalledTimes(5))
    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectType: 'MILITARY_UNIT',
        subjectId: 'unit-new',
        metricKey: 'military.unit.authorized_wartime',
        value: '15000',
      }),
    )

    // 인물 정본 Tenure 호출 — 정규화 militaryRankId + militaryRoleKind 포함 확인
    expect(addTenureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: 'person-1',
        militaryUnitId: 'unit-new',
        positionType: 'MILITARY_COMMANDER',
        militaryRankId: 'rank-brig-gen',
        militaryRoleKind: 'COMMANDER',
        rankTitle: '준장',
      }),
    )

    expect(addEventSideUnitMock).toHaveBeenCalledWith(
      'event-dabudong',
      'side-rok',
      expect.objectContaining({
        militaryUnitId: 'unit-new',
        role: 'MAIN_EFFORT',
      }),
    )

    expect(
      await screen.findByText('사령부·부대 등록 완료'),
    ).toBeInTheDocument()
  }, 20000)

  it('2단/1단 전환을 누르면 1단 보기로 바뀌고 선택이 저장된다', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '1단 세로 보기로 전환' }))
    expect(
      screen.getByRole('button', { name: '2단 좌우 분할 보기로 전환' }),
    ).toBeInTheDocument()
    expect(
      window.localStorage.getItem('papyrus:military-unit-register-layout-v2'),
    ).toBe('single')
  })

  it('정량 병력은 카드 박스 없이 평면 행·전용 날짜 필드로 나오고, 소속 국가는 빠른 검색·국가 선택 버튼·부대명 추천 칩을 제공한다', async () => {
    renderModal({ defaultCountryId: null })

    expect(screen.getByText('편제 기준')).toBeInTheDocument()
    expect(screen.getByText('정량 병력')).toBeInTheDocument()
    expect(screen.getByText('편제 장비')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: '병력 기준 시점' }),
    ).toBeInTheDocument()

    expect(screen.getByLabelText('소속 국가 빠른 검색')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /국가 선택/ })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/합동참모본부/), {
      target: { value: '대한민국 제7기동군단' },
    })
    const recommendChip = await screen.findByRole('button', {
      name: '+ 대한민국',
    })
    fireEvent.click(recommendChip)

    expect(
      screen.getByRole('group', { name: '선택된 소속 국가' }),
    ).toHaveTextContent('대한민국')
  })
})
