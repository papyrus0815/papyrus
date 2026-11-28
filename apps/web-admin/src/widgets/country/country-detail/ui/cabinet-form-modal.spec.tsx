import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import {
  CabinetFormModal,
  type CabinetFormModalProps,
} from './cabinet-form-modal.widget'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/features/country/api', () => ({
  useCountries: () => ({ data: [] }),
}))

jest.mock('@/features/historical-country/use-historical-countries.hook', () => ({
  useHistoricalCountries: () => ({ data: [] }),
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getCabinets: jest.fn(async () => []),
    getPositionDefinitions: jest.fn(async () => []),
    getTenuresByCountry: jest.fn(async () => []),
    createCabinet: jest.fn(),
    updateCabinet: jest.fn(),
    addGovernmentPositionTenure: jest.fn(),
    createGovernmentPositionTenure: jest.fn(),
    updateGovernmentPositionTenure: jest.fn(),
    getSuggestedCabinetMembers: jest.fn(async () => []),
  },
}))

jest.mock('@/shared/api/political-system', () => ({
  listPoliticalSystems: jest.fn(async () => []),
}))

jest.mock('@/shared/api/persons', () => ({
  getPersonsByHistoricalCountryUnion: jest.fn(async () => []),
  getPersonsByTenureCountry: jest.fn(async () => []),
  searchPersons: jest.fn(async () => []),
  createPerson: jest.fn(),
}))

jest.mock('@/shared/api/election', () => ({
  getScopedPoliticalParties: jest.fn(async () => [
    { id: 'party-liberal', name: '자유당', shortName: '자유당' },
    { id: 'party-work', name: '국민작업당', shortName: '작업당' },
  ]),
  getPartyMemberships: jest.fn(async () => []),
  getCabinetPoliticalParties: jest.fn(async () => []),
  addCabinetPoliticalParty: jest.fn(),
}))

jest.mock('@/shared/api/cabinet-events', () => ({
  listEventsForCabinet: jest.fn(async () => []),
  linkCabinetToEvent: jest.fn(),
  unlinkCabinetFromEvent: jest.fn(),
}))

jest.mock('@/shared/api/events', () => ({
  getEventLinkCandidates: jest.fn(async () => []),
}))

jest.mock('@/shared/api/political-party', () => ({
  politicalPartyApi: {
    create: jest.fn(),
  },
}))

const HUNGARY_COUNTRY: UnifiedCountry = {
  id: 'country-hu',
  type: 'modern',
  name: '헝가리',
  code: 'HU',
  flagEmoji: '🇭🇺',
  historicalCountries: [
    {
      id: 'hc-kingdom-dual',
      name: '오스트리아-헝가리 제국 성 이슈트반 왕관령',
      startYear: 1867,
      endYear: 1918,
    },
    {
      id: 'hc-regency',
      name: '헝가리 왕국 (섭정기)',
      startYear: 1920,
      endYear: 1946,
    },
    {
      id: 'hc-peoples',
      name: '헝가리 인민공화국',
      startYear: 1949,
      endYear: 1989,
    },
    {
      id: 'hc-third-rep',
      name: '헝가리 제3공화국',
      startYear: 1989,
      endYear: null,
    },
  ],
} as unknown as UnifiedCountry

function renderCabinetModal(overrideProps: Partial<CabinetFormModalProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CabinetFormModal
          isOpen
          onClose={jest.fn()}
          country={HUNGARY_COUNTRY}
          {...overrideProps}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
  window.localStorage.clear()
})

describe('CabinetFormModal — 정보 밀도 완화 · 점세개(⋯) 설정 메뉴 · UX 검증', () => {
  it('헤더 설정 버튼들이 점세개(⋯) 메뉴로 통합되고 2단 분할 <-> 1단 보기 및 자동 연결 옵션이 동작한다', () => {
    renderCabinetModal()

    expect(
      screen.queryByRole('navigation', { name: '폼 섹션 이동' }),
    ).not.toBeInTheDocument()

    expect(screen.getByTestId('cabinet-form-split-grid')).toBeInTheDocument()

    const leftPane = document.getElementById('cabinet-form-split-left')
    const rightPane = document.getElementById('cabinet-form-split-right')
    expect(leftPane).not.toBeNull()
    expect(rightPane).not.toBeNull()

    // 좌측 = 무엇을·어디에·언제 → 누가, 우측 = 내각 자체 → 어떻게 시작·끝났나
    expect(
      within(leftPane as HTMLElement).getByText('구분 · 소속 · 기간'),
    ).toBeInTheDocument()
    expect(
      within(leftPane as HTMLElement).getByText('수반 · 직책 · 대수'),
    ).toBeInTheDocument()
    expect(
      within(rightPane as HTMLElement).getByText('내각 · 정당 · 개요'),
    ).toBeInTheDocument()
    expect(
      within(rightPane as HTMLElement).getByText('출범 · 취임 · 퇴임 경위'),
    ).toBeInTheDocument()

    // 헤더 점세개(⋯) 설정 메뉴 열기
    const moreBtn = screen.getByRole('button', { name: '모달 설정 더보기' })
    fireEvent.click(moreBtn)

    const moreMenu = screen.getByRole('menu', { name: '모달 설정 더보기' })
    expect(
      within(moreMenu).getByRole('menuitemcheckbox', {
        name: /소속 정당을 집권 여당으로 연결/,
      }),
    ).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(within(moreMenu).getByRole('button', { name: '1단 보기' }))
    expect(
      screen.queryByTestId('cabinet-form-split-grid'),
    ).not.toBeInTheDocument()

    fireEvent.click(within(moreMenu).getByRole('button', { name: '2단 분할' }))
    expect(screen.getByTestId('cabinet-form-split-grid')).toBeInTheDocument()
  })

  it('수반 직책의 부가 설정(행정부 분류 · 추가/친정 직위)은 ⋯ 메뉴에 숨기지 않고 바로 펼쳐 보인다', () => {
    renderCabinetModal()

    // 예전엔 ⋯ 팝오버 안에 있었다 — 모든 정보가 한눈에 보이게 칸 아래에 펼친다
    expect(screen.queryByRole('button', { name: '수반 직책 설정 더보기' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '정부수반 (내각)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '국가원수 (행정부)' })).toBeInTheDocument()

    // 친정 직위('섭정') 클릭 시 직책 입력값에 반영된다
    fireEvent.click(screen.getByRole('button', { name: '섭정' }))
    expect(screen.getByDisplayValue('섭정')).toBeInTheDocument()
  })

  it('등록 방식은 간결한 1줄 캡션으로 표시되며 점세개(⋯) 버튼 클릭 시에만 상세 기준 안내가 열린다', () => {
    renderCabinetModal()

    const activeCallout = screen.getByTestId('active-cabinet-mode-callout')
    expect(activeCallout).toHaveTextContent('1인 수반 내각')

    expect(
      screen.queryByRole('region', { name: '내각 등록 방식 비교 안내' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '방식 기준 안내' }))

    const guidePanel = screen.getByRole('region', {
      name: '내각 등록 방식 비교 안내',
    })
    expect(guidePanel).toBeInTheDocument()

    fireEvent.click(
      within(guidePanel).getByRole('button', { name: /집단지도 · 위원회/ }),
    )
    expect(activeCallout).toHaveTextContent('집단지도 · 위원회')
  })

  it('출범 사건 · 취임/퇴임 경위 · 내각 개요는 접지 않고 처음부터 보인다', () => {
    renderCabinetModal()

    expect(screen.queryByRole('button', { name: /추가 정보 입력/ })).not.toBeInTheDocument()
    expect(screen.getByText('출범 사건')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('출범 기조나 연립 구성 등 간단한 설명 (선택)'),
    ).toBeInTheDocument()
    // 취임·퇴임 경위는 여러 줄 서술 칸(textarea), 방식·사유는 사건 모달식 칩 묶음
    expect(screen.getByPlaceholderText('예: 거국연립내각 구성 배경').tagName).toBe('TEXTAREA')
    expect(screen.getByRole('textbox', { name: '퇴임 경위' }).tagName).toBe('TEXTAREA')
    const appointmentGroup = screen.getByRole('radiogroup', { name: '취임 방식' })
    const parliamentChip = within(appointmentGroup).getByRole('radio', { name: '의회 선출' })
    fireEvent.click(parliamentChip)
    expect(parliamentChip).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(parliamentChip)
    expect(parliamentChip).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radiogroup', { name: '퇴임 사유' })).toBeInTheDocument()
  })

  it('군주 · 원수 재위 모드로 진입 시 군주 전용 직함 프리셋(국왕·황제 등)과 왕호 입력란을 제공하고 정당·내각명 필드는 숨긴다', () => {
    renderCabinetModal({ initialMode: 'monarch' })

    expect(
      screen.getByRole('heading', { name: '군주 · 국가원수 재위 등록' }),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('국왕')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('예: 세종, 빅토리아'),
    ).toBeInTheDocument()
    expect(screen.queryByText('집권 정당')).not.toBeInTheDocument()
    expect(screen.queryByText('내각 명칭')).not.toBeInTheDocument()
  })

  it('수반 인물은 국적 칸과 같은 검색 드롭다운 — 검색어로 서버 검색 결과까지 묶음으로 보이고 고르면 선택된다', async () => {
    const personsApi = jest.requireMock('@/shared/api/persons') as { searchPersons: jest.Mock }
    personsApi.searchPersons.mockImplementation(async (query: string) =>
      query.includes('이토')
        ? [
            {
              id: 'ito',
              name: '히로부미',
              surname: '이토',
              middleName: null,
              originalName: '伊藤博文',
              nameDisplayOrder: 'korean',
              country: null,
            },
          ]
        : [],
    )
    renderCabinetModal()

    const combobox = screen.getByRole('combobox', { name: '수반 인물' })
    fireEvent.focus(combobox)
    fireEvent.change(combobox, { target: { value: '이토' } })
    const option = await screen.findByRole('option', { name: /이토 히로부미/ })
    expect(screen.getByText('다른 국가 인물 (검색)')).toBeInTheDocument()
    fireEvent.click(option)
    await waitFor(() => expect(screen.getByText('이토 히로부미')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '인물 변경' })).toBeInTheDocument()
  })

  it('정체(PoliticalSystem)에 등록된 수반 카테고리가 있으면 기본 세팅되고 행정부 분류 전환 시 취임 방식·법정 임기까지 연동된다', async () => {
    const psApi = jest.requireMock('@/shared/api/political-system') as {
      listPoliticalSystems: jest.Mock
    }
    psApi.listPoliticalSystems.mockResolvedValueOnce([
      {
        id: 'ps-semi',
        name: '프랑스 제5공화국',
        countryId: 'country-hu',
        historicalCountryId: null,
        isCurrent: true,
        governmentForm: 'SEMI_PRESIDENTIAL',
        headSelectionMethod: 'DIRECT',
        headOfStateTermYears: 5,
        headOfStatePositionId: 'pos-pres',
        headOfStatePosition: {
          id: 'pos-pres',
          title: '대통령',
          positionType: 'HEAD_OF_STATE',
          isMonarchical: false,
        },
        headOfStateHasPower: true,
        headOfGovernmentPositionId: 'pos-pm',
        headOfGovernmentPosition: {
          id: 'pos-pm',
          title: '총리',
          positionType: 'HEAD_OF_GOVERNMENT',
          isMonarchical: false,
        },
        headOfGovernmentHasPower: true,
      },
    ])

    renderCabinetModal({
      headPositionOptions: [
        {
          id: 'pos-pm',
          title: '총리',
          positionType: 'HEAD_OF_GOVERNMENT',
          isMonarchical: false,
        },
        {
          id: 'pos-pres',
          title: '대통령',
          positionType: 'HEAD_OF_STATE',
          isMonarchical: false,
        },
      ],
    })

    expect(await screen.findByText('이원집정부제')).toBeInTheDocument()
    const roleSelect = screen.getByRole('combobox', { name: '수반 직책' })
    expect(roleSelect).toHaveValue('총리')

    // 국가원수(행정부) 전환 시 정체에 등록된 '대통령' 카탈로그와 '직접 선거' 취임 방식이 즉시 세팅됨
    fireEvent.click(screen.getByRole('button', { name: '국가원수 (행정부)' }))
    expect(roleSelect).toHaveValue('대통령')

    const appointmentGroup = screen.getByRole('radiogroup', { name: '취임 방식' })
    await waitFor(() => {
      expect(
        within(appointmentGroup).getByRole('radio', { name: '직접 선거' }),
      ).toHaveAttribute('aria-checked', 'true')
    })

    // 시작 연도 입력 시 법정 임기(5년) 만료일 적용 버튼이 노출됨
    const startYearInput = screen.getAllByRole('textbox', { name: '연도' })[0]
    fireEvent.change(startYearInput, { target: { value: '2022' } })
    const applyTermBtn = await screen.findByRole('button', {
      name: '법정 임기(5년) 만료일 적용',
    })
    fireEvent.click(applyTermBtn)
    expect(screen.getAllByRole('textbox', { name: '연도' })[1]).toHaveValue(
      '2027',
    )
  })

  it('같은 연도에 헌정 체제가 교차할 때(1960년 1·2공화국) 빠른 선택 칩을 노출하고 저장 시 선택된 정체 ID를 createCabinet에 영속화한다', async () => {
    const psApi = jest.requireMock('@/shared/api/political-system') as {
      listPoliticalSystems: jest.Mock
    }
    const careerApi = jest.requireMock('@/shared/api/person-career') as {
      personCareerApi: {
        createCabinet: jest.Mock
      }
    }
    careerApi.personCareerApi.createCabinet.mockResolvedValueOnce({
      id: 'cab-1960-interim',
    })
    psApi.listPoliticalSystems.mockResolvedValueOnce([
      {
        id: 'ps-kr-1st',
        name: '제1공화국',
        countryId: 'country-hu',
        historicalCountryId: null,
        startEra: 'AD',
        startYear: 1948,
        startMonth: 8,
        startDay: 15,
        endEra: 'AD',
        endYear: 1960,
        endMonth: 6,
        endDay: 14,
        isCurrent: false,
        governmentForm: 'PRESIDENTIAL',
      },
      {
        id: 'ps-kr-2nd',
        name: '제2공화국',
        countryId: 'country-hu',
        historicalCountryId: null,
        startEra: 'AD',
        startYear: 1960,
        startMonth: 6,
        startDay: 15,
        endEra: 'AD',
        endYear: 1961,
        endMonth: 5,
        endDay: 16,
        isCurrent: false,
        governmentForm: 'PARLIAMENTARY',
      },
    ])

    renderCabinetModal({ initialMode: 'collective' })

    const startYearInput = screen.getAllByRole('textbox', { name: '연도' })[0]
    fireEvent.change(startYearInput, { target: { value: '1960' } })

    // 동년 체제 전환 안내와 빠른 선택 칩 노출 확인
    expect(
      await screen.findByText(/헌정 체제 2개가 교차합니다/),
    ).toBeInTheDocument()

    const firstRepChip = screen.getByRole('button', {
      name: /제1공화국.*선택/,
    })
    fireEvent.click(firstRepChip)

    const collectiveNameInput = screen.getByPlaceholderText(
      /예: 혁명통치평의회/,
    )
    fireEvent.change(collectiveNameInput, {
      target: { value: '허정 과도정부' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: '행정부 · 내각 등록' }),
    )

    await waitFor(() => {
      expect(careerApi.personCareerApi.createCabinet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '허정 과도정부',
          politicalSystemId: 'ps-kr-1st',
        }),
      )
    })
  })
})
