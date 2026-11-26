import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { LawFormModal, type LawFormModalProps } from './country-law-form-modal'
import { CountryLawsSection } from './country-laws-section.widget'

const mockGetLaws = jest.fn()
const mockGetLawTypes = jest.fn()
const mockCreateLaw = jest.fn()
const mockCreateLawType = jest.fn()

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))

jest.mock('@/shared/api/election', () => {
  const actual = jest.requireActual('@/shared/api/election')
  return {
    ...actual,
    getLaws: (...args: unknown[]) => mockGetLaws(...args),
    getLawTypes: (...args: unknown[]) => mockGetLawTypes(...args),
    createLaw: (...args: unknown[]) => mockCreateLaw(...args),
    createLawType: (...args: unknown[]) => mockCreateLawType(...args),
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

const SAMPLE_LAW_TYPES = [
  { id: 'type-const', name: '헌법' },
  { id: 'type-act', name: '법률' },
  { id: 'type-decree', name: '칙령' },
]

function renderLawModal(props: Partial<LawFormModalProps> = {}) {
  const onSubmit = jest.fn(() => true)
  const onClose = jest.fn()
  renderWithTheme(
    <LawFormModal
      isOpen
      mode="create"
      lawScope={{ countryId: 'de' }}
      historicalCountryOptions={[
        { id: 'hc-weimar', name: '바이마르 공화국' },
      ]}
      lawTypes={SAMPLE_LAW_TYPES}
      saving={false}
      onClose={onClose}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, onClose }
}

describe('LawFormModal — 사건 등록 모달 문법 재디자인', () => {
  it('2단 반반 분할(좌 기본·시행조문 / 우 내용경위) + 머리 섹션 이동 알약 + 법 분류 칩 + 사건 날짜 칸을 렌더한다', () => {
    renderLawModal()

    for (const heading of ['기본 정보', '시행·조문', '내용·경위']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(
      screen.getByRole('navigation', { name: '폼 섹션 이동' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '1단 세로 보기로 전환' }),
    ).toHaveAttribute('aria-pressed', 'true')

    const leftColumn = document.getElementById('law-form-split-left')
    const rightColumn = document.getElementById('law-form-split-right')
    expect(leftColumn).toContainElement(
      screen.getByRole('heading', { name: '기본 정보' }),
    )
    expect(leftColumn).toContainElement(
      screen.getByRole('heading', { name: '시행·조문' }),
    )
    expect(rightColumn).toContainElement(
      screen.getByRole('heading', { name: '내용·경위' }),
    )

    const typeGroup = screen.getByRole('radiogroup', { name: /^법 분류/ })
    expect(typeGroup).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '헌법' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '법률' })).toBeInTheDocument()

    const startDateField = document.getElementById('country-law-form-start-date')
    expect(startDateField).not.toBeNull()
    expect(
      startDateField?.querySelector('input[aria-label="연도"]'),
    ).not.toBeNull()
  })

  it('명칭이 비면 등록이 잠기고, 조 없이 항만 적으면 경고를 띄우며, 모두 채우면 모달 payload로 저장한다', async () => {
    const { onSubmit } = renderLawModal()

    expect(screen.getByRole('button', { name: '법령 등록' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /필수 입력: 명칭/ }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^명칭/), {
      target: { value: '바이마르 헌법' },
    })
    fireEvent.click(screen.getByRole('radio', { name: '헌법' }))
    fireEvent.change(screen.getByLabelText(/^역사 국가/), {
      target: { value: 'hc-weimar' },
    })

    // 조 없이 항만 입력하면 저장 잠금 + 경고
    fireEvent.change(screen.getByLabelText(/항 \(제M항/), {
      target: { value: '2' },
    })
    expect(screen.getByRole('button', { name: '법령 등록' })).toBeDisabled()
    expect(
      screen.getAllByText('항을 입력하려면 조 번호를 먼저 입력하세요.').length,
    ).toBeGreaterThan(0)

    // 조 번호를 채우면 등록 준비 완료
    fireEvent.change(screen.getByLabelText(/조 \(제N조\)/), {
      target: { value: '48' },
    })
    expect(screen.getByText('제48조 제2항')).toBeInTheDocument()
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^요약/), {
      target: { value: '국가긴급권 조항' },
    })
    fireEvent.change(screen.getByLabelText(/^비고·제헌 경위/), {
      target: { value: '1919년 바이마르 국민회의 제정' },
    })

    fireEvent.click(screen.getByRole('button', { name: '법령 등록' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        mode: 'create',
        id: undefined,
        continueAfterSave: false,
        body: {
          name: '바이마르 헌법',
          summary: '국가긴급권 조항',
          articleNumber: 48,
          paragraphNumber: 2,
          startDate: null,
          endDate: null,
          note: '1919년 바이마르 국민회의 제정',
          lawTypeId: 'type-const',
          countryId: 'de',
          historicalCountryId: 'hc-weimar',
        },
      })
    })
  })

  it('모달 안에서 새 법 분류를 바로 추가하면 즉시 선택된다', async () => {
    const onCreateLawType = jest.fn(async (typeName: string) => ({
      id: 'type-new',
      name: typeName,
    }))
    renderLawModal({ onCreateLawType })

    fireEvent.click(screen.getByRole('button', { name: /새 법 분류 추가/ }))
    fireEvent.change(screen.getByLabelText('새 법 분류명'), {
      target: { value: '율령' },
    })
    fireEvent.click(screen.getByRole('button', { name: '분류 저장' }))

    await waitFor(() => {
      expect(onCreateLawType).toHaveBeenCalledWith('율령')
    })
  })
})

describe('CountryLawsSection — 공용 보라색 등록 버튼 + 모달 연동', () => {
  beforeEach(() => {
    mockGetLaws.mockResolvedValue([
      {
        id: 'law-1',
        name: '독일연방공화국 기본법',
        summary: '전후 서독 및 통일 독일 헌법',
        lawTypeId: 'type-const',
        lawType: { id: 'type-const', name: '헌법' },
      },
    ])
    mockGetLawTypes.mockResolvedValue(SAMPLE_LAW_TYPES)
  })

  it('법령 등록 버튼은 메인 보라색 공용 버튼을 쓰고 클릭 시 우측 사이드바 대신 등록 모달을 연다', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    renderWithTheme(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/history/country/de/laws']}>
          <CountryLawsSection countryId="de" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const registerBtn = await screen.findByRole('button', { name: '법령 등록' })
    expect(registerBtn).toHaveStyle({
      background: '#6366f1',
      color: '#ffffff',
    })

    fireEvent.click(registerBtn)

    const dialog = await screen.findByRole('dialog', { name: '법령 등록' })
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: '폼 섹션 이동' }),
    ).toBeInTheDocument()
  })
})
