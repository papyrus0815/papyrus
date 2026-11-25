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

jest.mock('@/shared/api/persons', () => ({
  getAllPersons: jest.fn(async () => [
    {
      id: 'person-1',
      name: '백선엽',
      surname: null,
      countryId: 'country-kr',
    },
  ]),
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

describe('MilitaryUnitFormModal — 진화형 5섹션 · 지도 · 정밀 병력 · 인물/사건 연결', () => {
  beforeEach(() => {
    createMock.mockClear()
    createObservationMock.mockClear()
    addTenureMock.mockClear()
    addEventSideUnitMock.mockClear()
    linkDepartmentEventMock.mockClear()
    window.localStorage.clear()
  })

  it('헤더에 진화된 5개 섹션 이동 알약과 2단/1단 전환이 표시된다', () => {
    renderModal()
    const nav = screen.getByRole('navigation', { name: '폼 섹션 이동' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기본 정보' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시기 · 위치 지도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '병력 · 전력' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '소속 · 인물 · 사건' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '임무 · 전투 · 수훈' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '1단 세로 보기로 전환' }),
    ).toBeInTheDocument()
  })

  it('병력·관할·임무·전투·수훈 5개 필드가 접힘 없이 상시 노출된 textarea로 렌더링되며 지도 필드가 함께 노출된다', () => {
    renderModal()

    // 접힘 토글 버튼이 없어야 함
    expect(
      screen.queryByRole('button', { name: /병력 · 관할 · 임무 · 전투 · 수훈/ }),
    ).not.toBeInTheDocument()

    // 주둔지 핀 지도 + 관할 구역 지도 컴포넌트가 상시 렌더링됨
    expect(screen.getByTestId('headquarters-location-field')).toBeInTheDocument()
    expect(screen.getByTestId('jurisdiction-map-field')).toBeInTheDocument()

    // 5개 필드 모두 TEXTAREA 태그로 상시 노출됨
    const strengthEl = document.getElementById('military-unit-form-strength')
    const jurisdictionEl = document.getElementById(
      'military-unit-form-jurisdiction',
    )
    const missionEl = document.getElementById(
      'military-unit-form-primary-mission',
    )
    const battlesEl = document.getElementById(
      'military-unit-form-notable-battles',
    )
    const honorsEl = document.getElementById('military-unit-form-honors')

    for (const el of [
      strengthEl,
      jurisdictionEl,
      missionEl,
      battlesEl,
      honorsEl,
    ]) {
      expect(el).not.toBeNull()
      expect(el?.tagName).toBe('TEXTAREA')
    }
  })

  it('이름이 비면 푸터가 빠진 필수 칸으로 안내하고 등록 버튼은 잠긴다', () => {
    renderModal()
    expect(screen.getByText('필수 입력: 부대·사령부명')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '부대 등록' })).toBeDisabled()
  })

  it('지도 좌표·관할 도형·정밀 병력(장교/부사관/병/장비)·인물·참전 사건을 함께 등록하고 정본 API들을 호출한다', async () => {
    renderModal()
    await screen.findAllByText('대한민국')

    // 1. 부대명
    fireEvent.change(screen.getByPlaceholderText(/합동참모본부/), {
      target: { value: '제1보병사단' },
    })

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

    // 4. 인물 빠른 검색 연결
    const personSearch = screen.getByLabelText('연결할 인물 검색')
    fireEvent.focus(personSearch)
    fireEvent.change(personSearch, { target: { value: '백선엽' } })
    const personOption = await screen.findByRole('option', { name: /백선엽/ })
    fireEvent.mouseDown(personOption)

    // 5. 사건 빠른 검색 연결 (참전 트랙)
    const eventSearch = screen.getByLabelText('연결할 사건 검색')
    fireEvent.focus(eventSearch)
    const eventOption = await screen.findByRole('option', { name: /다부동 전투/ })
    fireEvent.mouseDown(eventOption)
    await screen.findByRole('button', { name: '대한민국 국군·유엔군' })

    // 6. 저장 실행
    fireEvent.click(screen.getByRole('button', { name: '부대 등록' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toMatchObject({
      name: '제1보병사단',
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
    })

    // 정량 병력 Observation 호출 (총병력 + 장교 + 부사관 + 병 + 전차 = 5건)
    await waitFor(() => expect(createObservationMock).toHaveBeenCalledTimes(5))
    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectType: 'MILITARY_UNIT',
        subjectId: 'unit-new',
        metricKey: 'military.unit.authorized_wartime',
        value: '15000',
      }),
    )

    // 인물 정본 Tenure 호출
    expect(addTenureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: 'person-1',
        militaryUnitId: 'unit-new',
        positionType: 'MILITARY_COMMANDER',
      }),
    )

    // 참전 사건 SideDeployedUnit 호출
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

  it('정량 병력은 카드 박스 없이 평면 행·전용 날짜 필드로 나오고, 소속 국가는 사건 등록 모달처럼 빠른 검색·국가 선택 버튼·부대명 추천 칩을 제공한다', async () => {
    renderModal({ defaultCountryId: null })

    // 평면 FormRow 라벨 확인 + 병력 기준 시점 전용 날짜 입력(InlineDateField) 확인
    expect(screen.getByText('편제 기준')).toBeInTheDocument()
    expect(screen.getByText('정량 병력')).toBeInTheDocument()
    expect(screen.getByText('편제 장비')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: '병력 기준 시점' }),
    ).toBeInTheDocument()

    // 소속 국가 미선택 시 사건 등록 모달과 동일한 빠른 검색 + 국가 선택 버튼 노출
    expect(screen.getByLabelText('소속 국가 빠른 검색')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /국가 선택/ })).toBeInTheDocument()

    // 부대명에 국가명이 들어가면 추천 칩으로 원클릭 지정 가능
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
