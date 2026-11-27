import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { CompanyRegisterModal } from './company-register-modal'

const mockGetById = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/shared/api/company', () => ({
  companyApi: {
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))
jest.mock('@/shared/api/city', () => ({
  cityApi: { searchCities: jest.fn(async () => []) },
}))
jest.mock('@/shared/api/countries', () => ({
  getAllCountries: jest.fn(async () => [
    { id: 'gb', name: '영국' },
    { id: 'de', name: '독일' },
  ]),
}))
jest.mock('@/shared/api/historical-countries', () => ({
  getAllHistoricalCountries: jest.fn(async () => [
    { id: 'hc-england', name: '잉글랜드 왕국', startEra: 'AD', startYear: 927, endEra: 'AD', endYear: 1707, parentModernCountryIds: ['gb'] },
    { id: 'hc-bund', name: '독일 연방', startEra: 'AD', startYear: 1815, endEra: 'AD', endYear: 1866, parentModernCountryIds: ['de'] },
    { id: 'hc-reich', name: '독일 제국', startEra: 'AD', startYear: 1871, endEra: 'AD', endYear: 1918, parentModernCountryIds: ['de'] },
  ]),
}))
jest.mock('@/shared/ui/person-picker', () => ({
  PersonPickerButton: () => <button type="button">창립자 고르기</button>,
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
  mockGetById.mockReset()
  mockCreate.mockReset()
  mockUpdate.mockReset()
})

function renderModal(props: Partial<React.ComponentProps<typeof CompanyRegisterModal>> = {}) {
  const onClose = jest.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CompanyRegisterModal isOpen onClose={onClose} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onClose }
}

describe('CompanyRegisterModal — 사건 등록 모달 문법', () => {
  it('점 머리글 4섹션 + 헤더 섹션 이동 알약 + 2단 보기 전환 + 상태 칩을 렌더한다', () => {
    renderModal()

    for (const heading of ['기본 정보', '소속·인물', '기간·링크', '소개']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByRole('navigation', { name: '폼 섹션 이동' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1단 세로 보기로 전환' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: '활동 중' })).toHaveAttribute('aria-checked', 'true')
  })

  it('기업명이 비면 푸터가 필수 칸 이동 알약을 띄우고 저장을 막는다', () => {
    renderModal()

    expect(screen.getByRole('button', { name: /필수 입력: 기업명/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기업 등록' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/기업명/), { target: { value: '영국 동인도회사' } })
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기업 등록' })).toBeEnabled()
  })

  it('웹사이트가 http(s)://로 시작하지 않으면 칸 아래 오류 + 저장 막힘', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/기업명/), { target: { value: '크루프' } })
    fireEvent.change(screen.getByLabelText(/공식 웹사이트/), { target: { value: 'krupp.de' } })

    expect(screen.getAllByText('공식 웹사이트는 http(s)://로 시작해야 합니다.').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '기업 등록' })).toBeDisabled()
  })

  it('등록 후 계속은 3지 다이얼로그 없이 폼을 비우고 국가 기본값은 유지한다', async () => {
    mockCreate.mockResolvedValue({ id: 'c1', name: '영국 동인도회사' })
    renderModal({ defaultCountryId: 'gb' })

    fireEvent.change(screen.getByLabelText(/기업명/), { target: { value: '영국 동인도회사' } })
    fireEvent.click(screen.getByRole('button', { name: '등록 후 계속' }))

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ name: '영국 동인도회사', countryId: 'gb', status: 'ACTIVE' })
    await waitFor(() => expect(screen.getByLabelText(/기업명/)).toHaveValue(''))
    expect(screen.queryByText('기업 등록 완료')).not.toBeInTheDocument()
  })

  it('수정 저장은 건드리지 않은 날짜 칸을 보내지 않는다(칸이 못 담는 기존 날짜 보존)', async () => {
    mockGetById.mockResolvedValue({
      id: 'c9',
      name: '곤고구미',
      status: 'ACTIVE',
      foundedAt: '-000578-01-01T00:00:00.000Z',
      dissolvedAt: null,
      countryId: 'jp',
    })
    mockUpdate.mockResolvedValue({ id: 'c9', name: '곤고구미 (金剛組)' })
    renderModal({ companyId: 'c9' })

    await waitFor(() => expect(screen.getByLabelText(/기업명/)).toHaveValue('곤고구미'))
    fireEvent.change(screen.getByLabelText(/기업명/), { target: { value: '곤고구미 (金剛組)' } })
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1))
    const payload = mockUpdate.mock.calls[0][1]
    expect(payload).not.toHaveProperty('foundedAt')
    expect(payload).not.toHaveProperty('dissolvedAt')
    expect(payload).not.toHaveProperty('description')
    expect(payload).toMatchObject({ name: '곤고구미 (金剛組)', countryId: 'jp' })
  })

  it('소속 국가는 한 칸 — 역사 국가만 소속인 기업은 현대 국가 없이 그대로 저장한다', async () => {
    mockGetById.mockResolvedValue({
      id: 'c2',
      name: '디스콘토-게젤샤프트',
      status: 'MERGED',
      foundedAt: '1851-01-01T00:00:00.000Z',
      dissolvedAt: null,
      countryId: null,
      historicalCountryId: 'hc-reich',
    })
    mockUpdate.mockResolvedValue({ id: 'c2', name: '디스콘토-게젤샤프트' })
    renderModal({ companyId: 'c2' })

    await waitFor(() => expect(screen.getByLabelText(/기업명/)).toHaveValue('디스콘토-게젤샤프트'))
    expect(screen.queryByText('현대 국가', { selector: 'span' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('독일 제국')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/기업명/), { target: { value: '디스콘토 게젤샤프트' } })
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1))
    expect(mockUpdate.mock.calls[0][1]).toMatchObject({ countryId: null, historicalCountryId: 'hc-reich' })
  })

  it('현대 국가인데 설립 연도가 그 나라 성립 전이면 그 시대 역사 국가를 제안하고, 고르면 현대 국가 칸을 비운다', async () => {
    mockGetById.mockResolvedValue({
      id: 'c3',
      name: '크루프',
      status: 'ACTIVE',
      foundedAt: '1851-03-01T00:00:00.000Z',
      dissolvedAt: null,
      countryId: 'de',
      historicalCountryId: null,
    })
    mockUpdate.mockResolvedValue({ id: 'c3', name: '크루프' })
    renderModal({ companyId: 'c3' })

    const suggestion = await screen.findByRole('button', { name: '독일 연방' })
    expect(screen.getByText('1851년 설립이면')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '독일 제국' })).not.toBeInTheDocument()

    fireEvent.click(suggestion)
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1))
    expect(mockUpdate.mock.calls[0][1]).toMatchObject({ countryId: null, historicalCountryId: 'hc-bund' })
  })
})
