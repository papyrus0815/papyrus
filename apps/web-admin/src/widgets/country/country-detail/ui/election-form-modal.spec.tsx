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
  it('2단 반반 분할(좌 기본·투표결과 / 우 의회·서술) + 머리 섹션 이동, 유형·상태는 사건 분야 칩, 날짜는 사건 날짜 칸', () => {
    renderModal()
    for (const heading of ['기본 정보', '투표·결과', '의회·서술']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByRole('navigation', { name: '폼 섹션 이동' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1단 세로 보기로 전환' })).toHaveAttribute('aria-pressed', 'true')
    /* 성격 순서: 왼쪽 = 어떤 선거인가 → 투표·결과, 오른쪽 = 그 선거로 꾸려진 의회 → 긴 글 */
    const leftColumn = document.getElementById('election-form-split-left')
    expect(leftColumn).toContainElement(screen.getByRole('heading', { name: '기본 정보' }))
    expect(leftColumn).toContainElement(screen.getByRole('heading', { name: '투표·결과' }))
    expect(document.getElementById('election-form-split-right')).toContainElement(
      screen.getByRole('heading', { name: '의회·서술' }),
    )
    expect(screen.getByRole('radiogroup', { name: /^유형/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '국회·의회 지역구' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: '상태' })).toBeInTheDocument()
    // 투표일은 연·월·일을 직접 치는 사건 날짜 칸(오늘 날짜로 시작) — 달력 버튼은 칸 안 아이콘
    const pollField = document.getElementById('election-form-poll-date')
    expect(pollField).not.toBeNull()
    expect(pollField?.querySelector('input[aria-label="연도"]')).toHaveValue(String(new Date().getFullYear()))
  })

  it('명칭이 맨 위·추천 버튼 없음, 명칭이 비면 저장이 잠기고, 칩으로 바꾼 유형·textarea 설명과 함께 등록한다', () => {
    const { onSubmit } = renderModal()
    expect(screen.getByRole('button', { name: '선거 등록' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /필수 입력: 명칭/ })).toBeInTheDocument()

    /* 명칭 칸이 유형 칩보다 먼저(문서 순서), 추천 버튼은 없다 */
    const nameInput = screen.getByLabelText(/^명칭/)
    const typeGroup = screen.getByRole('radiogroup', { name: /^유형/ })
    expect(nameInput.compareDocumentPosition(typeGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: /표준 명칭 채우기/ })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: '대통령·수반 직선' }))
    fireEvent.change(nameInput, { target: { value: '제1대 대통령·수반 직선' } })
    fireEvent.change(screen.getByPlaceholderText(/동일 국가·유형 내 순번/), { target: { value: '1' } })
    /* 서술은 textarea — 빈 줄 = 문단, 저장은 <p> HTML */
    fireEvent.change(screen.getByLabelText(/^설명/), { target: { value: '첫 직선제.\n\n결선 없이 확정.' } })
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
          description: '<p>첫 직선제.</p><p>결선 없이 확정.</p>',
        }),
      }),
    )
  })

  it('머리 섹션 이동을 누르면 그 묶음으로 간다', () => {
    renderModal()
    const scrollSpy = jest.mocked(Element.prototype.scrollIntoView)
    scrollSpy.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /의회·서술/ }))
    expect(scrollSpy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /의회·서술/ })).toHaveAttribute('aria-current', 'location')
  })
})
