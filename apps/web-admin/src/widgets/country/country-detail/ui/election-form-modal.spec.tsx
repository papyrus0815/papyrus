import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ElectionFormModal } from './country-elections-section.widget'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/widgets/person/person-detail-panel/person-detail-panel', () => ({ PersonDetailPanel: () => null }))
/* 리치텍스트 에디터는 jsdom에서 무겁다 — 이 스펙은 폼 조판과 저장 계약만 본다 */
jest.mock('@/shared/ui/rich-text-editor/rich-text-editor', () => ({
  RichTextEditor: ({ placeholder }: { placeholder?: string }) => <div data-testid="rich-text">{placeholder}</div>,
}))

/* jsdom에는 scrollIntoView가 없다 */
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

function renderModal(props: Partial<React.ComponentProps<typeof ElectionFormModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSubmit = jest.fn()
  renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ElectionFormModal
          electionScope={{ countryId: 'de' }}
          mode="create"
          historicalCountryOptions={[]}
          saving={false}
          onClose={jest.fn()}
          onSubmit={onSubmit}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onSubmit }
}

describe('ElectionFormModal — 사건 등록 모달 문법', () => {
  it('2단 분할(좌 기본 / 우 의회·집계) + 머리 섹션 이동, 유형·상태는 사건 분야 칩, 날짜는 사건 날짜 칸', () => {
    renderModal()
    for (const heading of ['기본 정보', '의회·임기', '집계·설명']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByRole('navigation', { name: '폼 섹션 이동' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1단 세로 보기로 전환' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('election-form-split-left')).toContainElement(
      screen.getByRole('heading', { name: '기본 정보' }),
    )
    expect(document.getElementById('election-form-split-right')).toContainElement(
      screen.getByRole('heading', { name: '집계·설명' }),
    )
    expect(screen.getByRole('radiogroup', { name: /^유형/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '국회·의회 지역구' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: '상태' })).toBeInTheDocument()
    // 투표일은 연·월·일을 직접 치는 사건 날짜 칸(오늘 날짜로 시작) — 달력 버튼은 칸 안 아이콘
    const pollField = document.getElementById('election-form-poll-date')
    expect(pollField).not.toBeNull()
    expect(pollField?.querySelector('input[aria-label="연도"]')).toHaveValue(String(new Date().getFullYear()))
  })

  it('명칭이 비면 저장이 잠기고, 표준 명칭 채우기 후 칩으로 바꾼 유형과 함께 등록한다', () => {
    const { onSubmit } = renderModal()
    expect(screen.getByRole('button', { name: '선거 등록' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /필수 입력: 명칭/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '대통령·수반 직선' }))
    fireEvent.click(screen.getByRole('button', { name: /표준 명칭 채우기/ }))
    expect(screen.getByLabelText(/^명칭/)).toHaveValue('제1대 대통령·수반 직선')
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '마감' }))
    fireEvent.change(screen.getByPlaceholderText('0 이상 정수'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '선거 등록' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'create',
        body: expect.objectContaining({
          name: '제1대 대통령·수반 직선',
          electionType: 'PRESIDENTIAL_OR_HEAD',
          status: 'FINALIZED',
          totalSeats: 300,
          convocationOrdinal: 1,
          countryId: 'de',
        }),
      }),
    )
  })

  it('머리 섹션 이동을 누르면 그 묶음으로 간다', () => {
    renderModal()
    const scrollSpy = jest.mocked(Element.prototype.scrollIntoView)
    scrollSpy.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /집계·설명/ }))
    expect(scrollSpy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /집계·설명/ })).toHaveAttribute('aria-current', 'location')
  })
})
