import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'
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

    expect(
      within(leftPane as HTMLElement).getByText('출범 · 수반'),
    ).toBeInTheDocument()
    expect(
      within(rightPane as HTMLElement).getByText('직책 · 명칭 · 정당'),
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

  it('수반 직책의 부가 설정(행정부 분류 · 추가/친정 직위)이 점세개(⋯) 팝오버로 분리되어 초기 화면이 깔끔하게 유지된다', () => {
    renderCabinetModal()

    // 초기 화면에 정부수반/국가원수 토글이 노출되지 않고 점세개 팝오버 안에 숨겨진다
    expect(
      screen.queryByRole('button', { name: '정부수반 (내각)' }),
    ).not.toBeInTheDocument()

    const roleMoreBtn = screen.getByRole('button', {
      name: '수반 직책 설정 더보기',
    })
    fireEvent.click(roleMoreBtn)

    const rolePopover = screen.getByRole('dialog', {
      name: '수반 직책 설정 및 추가 프리셋',
    })
    expect(
      within(rolePopover).getByRole('button', { name: '정부수반 (내각)' }),
    ).toBeInTheDocument()
    expect(
      within(rolePopover).getByRole('button', { name: '국가원수 (행정부)' }),
    ).toBeInTheDocument()

    // 친정 직위('섭정') 클릭 시 직책 입력값에 반영되고 팝오버가 닫힌다
    fireEvent.click(within(rolePopover).getByRole('button', { name: '섭정' }))
    expect(
      screen.queryByRole('dialog', {
        name: '수반 직책 설정 및 추가 프리셋',
      }),
    ).not.toBeInTheDocument()
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

  it('출범 사건 · 취임/퇴임 경위 · 내각 개요는 기본적으로 접혀 있으며 [추가 정보 입력]을 누르면 펼쳐진다', () => {
    renderCabinetModal()

    expect(screen.queryByText('출범 사건')).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText(
        '출범 기조나 연립 구성 등 간단한 설명 (선택)',
      ),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /추가 정보 입력/,
      }),
    )

    expect(screen.getByText('출범 사건')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(
        '출범 기조나 연립 구성 등 간단한 설명 (선택)',
      ),
    ).toBeInTheDocument()
  })
})
