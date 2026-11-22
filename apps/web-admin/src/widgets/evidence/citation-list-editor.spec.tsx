import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'

import type { Citation, Source } from '@/shared/api/evidence'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { type CitationDraft, CitationListEditor, citationDraftsOf, citationInputsOf } from './citation-list-editor'

jest.mock('@/shared/api/evidence', () => ({
  searchSources: jest.fn(async () => [
    { id: 'src-namu', kind: 'WEBSITE', title: '국가 파시스트당 — 나무위키', authors: null, publishedYear: null, tier: 'TERTIARY' },
  ]),
}))

const namu = { id: 'src-namu', kind: 'WEBSITE', title: '국가 파시스트당 — 나무위키', tier: 'TERTIARY' } as Source

describe('인용 목록 — 변환', () => {
  it('저장된 인용 → 편집 줄 → 입력(기존 출처는 sourceId만)', () => {
    const drafts = citationDraftsOf([{ id: 'c1', locator: '인포박스', quote: null, note: null, sortOrder: 0, source: namu } as Citation])
    expect(citationInputsOf(drafts)).toEqual({
      inputs: [{ sourceId: 'src-namu', locator: '인포박스', quote: null }],
      problem: null,
    })
  })

  it('새 출처 — 제목 필수, 연도·주소 형식 검사', () => {
    const base: CitationDraft = {
      key: 'n1',
      mode: 'new',
      newSource: { kind: 'BOOK', title: '', authors: '', publishedYear: '', url: '', tier: '' },
      locator: '',
      quote: '',
    }
    expect(citationInputsOf([base]).problem).toMatch(/제목/)
    const withYear = { ...base, newSource: { ...base.newSource, title: "Mussolini's Italy", publishedYear: '2005년' } } as CitationDraft
    expect(citationInputsOf([withYear]).problem).toMatch(/연도/)
    const ok = { ...base, newSource: { ...base.newSource, title: "Mussolini's Italy", authors: 'R. J. B. Bosworth', publishedYear: '2005', tier: 'SECONDARY' as const } } as CitationDraft
    expect(citationInputsOf([ok])).toEqual({
      inputs: [
        {
          source: { kind: 'BOOK', title: "Mussolini's Italy", authors: 'R. J. B. Bosworth', publishedYear: 2005, url: null, tier: 'SECONDARY' },
          locator: null,
          quote: null,
        },
      ],
      problem: null,
    })
  })
})

describe('인용 목록 — 화면', () => {
  it('서고에서 찾아 고르면 줄이 생기고, 이미 고른 출처는 후보에서 빠진다', async () => {
    let current: CitationDraft[] = []
    const onChange = jest.fn((next: CitationDraft[]) => {
      current = next
    })
    const { rerender } = renderWithTheme(
      <QueryClientProvider client={new QueryClient()}>
        <CitationListEditor value={current} onChange={onChange} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /서고에서 찾기/ }))
    fireEvent.click(await screen.findByRole('option', { name: /나무위키/ }))
    expect(current).toHaveLength(1)
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <CitationListEditor value={current} onChange={onChange} />
      </QueryClientProvider>,
    )
    expect(screen.getByLabelText('1번 위치')).toBeInTheDocument()
  })
})
