import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import GovernmentPositionsPage from './government-positions.page'

const mockGetDefinitions = jest.fn()
const mockGetDefinitionById = jest.fn()
const mockGetUnnormalized = jest.fn()
const mockCreateDefinition = jest.fn()
const mockListRanks = jest.fn()

jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))

jest.mock('@/features/country/api', () => ({
  useCountries: () => ({
    data: [{ id: 'kr', name: '대한민국', isoCode: 'KR', flagEmoji: '🇰🇷' }],
  }),
}))

jest.mock('@/features/historical-country/use-historical-countries.hook', () => ({
  useHistoricalCountries: () => ({
    data: [{ id: 'joseon', name: '조선', startYear: 1392, endYear: 1897 }],
  }),
}))

jest.mock('@/shared/api/administration-department', () => ({
  administrationDepartmentApi: {
    getCategories: jest.fn().mockResolvedValue([
      { id: 'cat-1', name: '외교·통상' },
    ]),
    getAll: jest.fn().mockResolvedValue([
      { id: 'dept-1', name: '외교부', countryId: 'kr' },
    ]),
  },
}))

jest.mock('@/shared/api/military-rank', () => {
  const actual = jest.requireActual('@/shared/api/military-rank')
  return {
    ...actual,
    militaryRankApi: {
      list: (...args: unknown[]) => mockListRanks(...args),
      createOrResolve: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
  }
})

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getPositionDefinitions: (...args: unknown[]) => mockGetDefinitions(...args),
    getPositionDefinitionById: (...args: unknown[]) =>
      mockGetDefinitionById(...args),
    getUnnormalizedPositionTenures: (...args: unknown[]) =>
      mockGetUnnormalized(...args),
    createPositionDefinition: (...args: unknown[]) =>
      mockCreateDefinition(...args),
    updatePositionDefinition: jest.fn(),
    deletePositionDefinition: jest.fn(),
    addPositionDefinitionScope: jest.fn(),
    updatePositionDefinitionScope: jest.fn(),
    removePositionDefinitionScope: jest.fn(),
    mergePositionDefinition: jest.fn(),
    updateGovernmentPositionTenure: jest.fn(),
  },
}))

jest.mock('@/widgets/person/person-inline-modal/person-inline-modal', () => ({
  PersonInlineModal: () => null,
}))

function renderPage(initialEntry = '/government/positions') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithTheme(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/government/positions"
            element={<GovernmentPositionsPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GovernmentPositionsPage — 관직·직책·계급 정본 관리 지면', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDefinitions.mockResolvedValue([
      {
        id: 'pos-pm',
        title: '총리',
        titleEn: 'Prime Minister',
        positionType: 'HEAD_OF_GOVERNMENT',
        rank: 1,
        isMonarchical: false,
        isGeneric: false,
        scopes: [],
        tenureCount: 44,
        treatySignatoryCount: 2,
      },
      {
        id: 'pos-yeong',
        title: '영의정',
        titleLocal: '領議政',
        titleEn: 'Chief State Councillor',
        positionType: 'HEAD_OF_GOVERNMENT',
        rank: 1,
        isMonarchical: false,
        isGeneric: false,
        scopes: [
          {
            id: 'sc-1',
            definitionId: 'pos-yeong',
            historicalCountryId: 'joseon',
            historicalCountry: { id: 'joseon', name: '조선' },
            localTitle: '영의정',
          },
        ],
        tenureCount: 12,
      },
      {
        id: 'pos-gen',
        title: '정부수반',
        positionType: 'HEAD_OF_GOVERNMENT',
        rank: 999,
        isGeneric: true,
        scopes: [],
      },
    ])
    mockGetDefinitionById.mockResolvedValue({
      id: 'pos-yeong',
      title: '영의정',
      titleLocal: '領議政',
      positionType: 'HEAD_OF_GOVERNMENT',
      rank: 1,
      scopes: [
        {
          id: 'sc-1',
          definitionId: 'pos-yeong',
          historicalCountryId: 'joseon',
          historicalCountry: { id: 'joseon', name: '조선' },
        },
      ],
      tenureCount: 1,
      tenures: [
        {
          id: 'ten-1',
          ordinal: 1,
          startEra: 'AD',
          startYear: 1400,
          endYear: 1401,
          person: { id: 'p-1', name: '이서' },
          historicalCountry: { id: 'joseon', name: '조선' },
        },
      ],
    })
    mockGetUnnormalized.mockResolvedValue([])
    mockListRanks.mockResolvedValue([
      {
        id: 'rk-1',
        name: '원수',
        nameEn: 'Field Marshal',
        category: 'MARSHAL',
        rankOrder: 1,
        natoCode: 'OF-10',
        isUniversal: true,
      },
    ])
  })

  it('시스템 일반 정의(isGeneric)를 제외한 정본 직책을 대장에 표시하고 범위 필터가 동작한다', async () => {
    renderPage()

    expect(await screen.findByText('총리')).toBeInTheDocument()
    expect(screen.getByText('영의정')).toBeInTheDocument()
    // isGeneric=true 인 '정부수반' 일반 그릇은 정본 대장에 노출되지 않아야 함
    expect(screen.queryByText('Prime Minister')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /국가 · 시대 고유/ }))
    expect(screen.queryByText('총리')).not.toBeInTheDocument()
    expect(screen.getByText('영의정')).toBeInTheDocument()
  })

  it('직책 행 클릭 시 우측 상세·편집 드로어가 열리고 역대 재임자 탭을 조회할 수 있다', async () => {
    renderPage()
    const rowTitle = await screen.findByText('영의정')
    fireEvent.click(rowTitle)

    expect(
      await screen.findByRole('complementary', {
        name: '직책 정본 상세 및 편집',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /역대 재임자/ }))
    expect(await screen.findByText('이서')).toBeInTheDocument()
  })

  it('새 직책 정본 등록 버튼을 눌러 새 DB 정본을 생성할 수 있다', async () => {
    mockCreateDefinition.mockResolvedValue({
      id: 'pos-new',
      title: '재무대신',
      positionType: 'CABINET_MINISTER',
    })

    renderPage()
    await screen.findByText('총리')

    fireEvent.click(screen.getByRole('button', { name: /새 직책 정본 등록/ }))
    const titleInput = screen.getByPlaceholderText(
      /내각총리대신, 영의정, 외무장관/,
    )
    fireEvent.change(titleInput, { target: { value: '재무대신' } })
    fireEvent.click(screen.getByRole('button', { name: '직책 정본 등록' }))

    await waitFor(() => {
      expect(mockCreateDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '재무대신',
        }),
      )
    })
  })

  it('군 계급 정본 서브탭 전환 시 MilitaryRank 목록을 표시한다', async () => {
    renderPage()
    await screen.findByText('총리')

    fireEvent.click(screen.getByRole('tab', { name: /군 계급/ }))
    expect(await screen.findByText('원수')).toBeInTheDocument()
    expect(screen.getByText('OF-10')).toBeInTheDocument()
  })
})
