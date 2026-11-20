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

jest.mock('@/shared/api/administration-department', () => ({
  administrationDepartmentApi: { getAll: jest.fn(async () => []) },
}))

jest.mock('@/entities/military-unit', () => ({
  fetchCountryScopedMilitaryUnits: jest.fn(async () => []),
  militaryUnitQueryKeys: { all: ['military-units'] },
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

jest.mock('@/shared/ui/place-autocomplete/place-autocomplete', () => ({
  PlaceSelect: () => null,
}))

function renderModal(props: Partial<React.ComponentProps<typeof MilitaryUnitFormModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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

describe('MilitaryUnitFormModal — 사건 등록 모달 문법', () => {
  beforeEach(() => {
    createMock.mockClear()
    window.localStorage.clear()
  })

  it('헤더에 섹션 이동 알약 3개와 2단/1단 전환이 보인다', () => {
    renderModal()
    const nav = screen.getByRole('navigation', { name: '폼 섹션 이동' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기본 정보' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '소속 · 지휘 계통' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시기 · 소재지 · 설명' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1단 세로 보기로 전환' })).toBeInTheDocument()
  })

  it('이름이 비면 푸터가 빠진 필수 칸으로 안내하고 등록 버튼은 잠긴다', () => {
    renderModal()
    expect(screen.getByText('필수 입력: 부대·사령부명')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '부대 등록' })).toBeDisabled()
  })

  it('이름을 쓰면 준비 완료로 바뀌고, 등록하면 3지 분기 다이얼로그가 뜬다', async () => {
    renderModal()
    await screen.findByText('대한민국')
    fireEvent.change(screen.getByPlaceholderText(/합동참모본부/), {
      target: { value: '제1야전군' },
    })
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '초기화' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '부대 등록' }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toMatchObject({
      name: '제1야전군',
      countryId: 'country-kr',
      historicalCountryId: null,
    })
    expect(await screen.findByText('사령부·부대 등록 완료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '상세 보기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '부대 계속 등록' })).toBeInTheDocument()
  })

  it('2단/1단 전환을 누르면 1단 보기로 바뀌고 선택이 저장된다', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '1단 세로 보기로 전환' }))
    expect(screen.getByRole('button', { name: '2단 좌우 분할 보기로 전환' })).toBeInTheDocument()
    expect(window.localStorage.getItem('papyrus:military-unit-register-layout-v2')).toBe(
      'single',
    )
  })
})
