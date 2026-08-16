/**
 * EventDetailPanel — 상위 사건 링크(W3) 회귀 방지.
 *
 *  1. parentEventRef가 있으면 정보 그리드에 '상위 사건' 행이 뜨고,
 *     클릭 시 onSelectEvent(parent.id)로 드로어가 전환된다
 *  2. 최상위 사건(parentEventRef 없음)은 행 자체를 그리지 않는다
 */
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/pages/events/create/events.types'

// react-router는 jsdom에 없는 TextEncoder를 모듈 로드 시점에 건드린다 — 훅만 대체.
const navigateMock = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

// 실제 모듈은 api.service(import.meta.env)를 끌어와 ts-jest가 못 읽는다 — 전체 목킹.
jest.mock('@/shared/api/events', () => ({
  deleteEvent: jest.fn(),
}))

// RichTextReadView 유틸 → upload → client.ts(import.meta) 체인을 끊는다.
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))

// 엔티티 클릭 배선(rich-text-prose-with-entity-clicks)이 dynasty/glossary API →
// client.ts(import.meta)를 끌어온다 — 이 spec은 배경/여파를 비워 렌더하지 않으므로 스텁.
jest.mock('@/shared/ui/rich-text-read-view', () => ({
  RichTextReadView: () => null,
}))

import { EventDetailPanel } from './event-detail-panel'

const node: EventHierarchyNode = {
  id: 'c1',
  title: '서부 전선',
  summary: '',
  period: { start: '1914-08-04' },
  importance: 'notable',
  children: [],
}

const event = {
  id: 'c1',
  title: '서부 전선',
  category: '전쟁',
  categoryId: 'cat-war',
  description: '',
  startDate: '1914-08-04',
  background: '',
  aftermath: '',
  relatedCountries: [],
  relatedHistoricalCountries: [],
  eventSections: [],
  sectionTitles: [],
  hierarchy: node,
  visuals: { heroImageUrl: '', thumbnailUrl: '', gallery: [] },
} as unknown as HistoricalEvent

const baseProps = {
  isLoading: false,
  selectedEvent: event,
  selectedNode: node,
  dbCategories: [],
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('EventDetailPanel — 상위 사건 링크', () => {
  it('parentEventRef가 있으면 행이 뜨고 클릭 시 onSelectEvent(parent.id)로 전환된다', () => {
    const onSelectEvent = jest.fn()
    renderWithTheme(
      <EventDetailPanel
        {...baseProps}
        parentEventRef={{ id: 'r1', title: '제1차 세계 대전' }}
        onSelectEvent={onSelectEvent}
      />,
    )

    expect(screen.getByText('상위 사건')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: '제1차 세계 대전' }),
    )
    expect(onSelectEvent).toHaveBeenCalledWith('r1')
  })

  it('최상위 사건(parentEventRef 없음)은 행을 그리지 않는다', () => {
    renderWithTheme(<EventDetailPanel {...baseProps} />)
    expect(screen.queryByText('상위 사건')).not.toBeInTheDocument()
  })
})
