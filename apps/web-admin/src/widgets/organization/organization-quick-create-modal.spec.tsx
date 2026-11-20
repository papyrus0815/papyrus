import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { OrganizationQuickCreateModal } from './organization-quick-create-modal'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))

/* api.service의 import.meta(vite env)는 ts-jest가 못 읽는다 — 이 모달은 쓰지 않으니 비워 둔다 */
jest.mock('@/shared/api/api.service', () => ({}))

jest.mock('@/shared/api/countries', () => ({
  getAllCountries: jest.fn(async () => [{ id: 'country-fr', name: '프랑스', flagEmoji: '🇫🇷' }]),
}))

jest.mock('@/shared/api/historical-countries', () => ({
  getAllHistoricalCountries: jest.fn(async () => [{ id: 'hc-fr1', name: '프랑스 제1공화국' }]),
}))

jest.mock('@/shared/api/persons', () => ({ getAllPersons: jest.fn(async () => []) }))

const createMock = jest.fn(async (_connection: unknown, payload: { name: string; type: string }) => ({
  id: 'org-new',
  name: payload.name,
  type: payload.type,
}))

jest.mock('@/shared/api/organizations', () => {
  const actual = jest.requireActual('@/shared/api/organizations')
  return {
    ...actual,
    createOrganization: (connection: unknown, payload: { name: string; type: string }) =>
      createMock(connection, payload),
  }
})

function renderModal(props: Partial<React.ComponentProps<typeof OrganizationQuickCreateModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onCreated = jest.fn()
  const onClose = jest.fn()
  renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <OrganizationQuickCreateModal onClose={onClose} onCreated={onCreated} {...props} />
    </QueryClientProvider>,
  )
  return { onCreated, onClose }
}

describe('OrganizationQuickCreateModal — 사건 등록 모달 문법', () => {
  beforeEach(() => createMock.mockClear())

  it('공용 등록 모달 셸(dialog)에 섹션 이동 알약과 필수 칸 이동 푸터가 선다', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '새 기구·협의체·조직 등록' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '폼 섹션 이동' })
    expect(nav).toHaveTextContent('기본 정보')
    expect(nav).toHaveTextContent('소속 인물')
    expect(screen.getByRole('button', { name: /필수 입력: 기구·조직명/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기구·조직 만들기' })).toBeDisabled()
  })

  it('예전 칸과 힌트를 그대로 둔다 — 유형 예시·전용 도메인 안내·국내형 소재 국가', () => {
    renderModal({ defaultType: 'NGO' })
    expect(screen.getByText(/자코뱅 클럽/)).toBeInTheDocument()
    expect(screen.getByText(/전용 도메인에서 등록합니다/)).toBeInTheDocument()
    expect(screen.getByText('역사 국가')).toBeInTheDocument()
    expect(screen.getByText('현대 국가')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /소속 인물 검색·추가/ })).toBeInTheDocument()
  })

  it('국제형 유형을 고르면 회원국 칸이 서고 소재 국가 칸은 빠진다', () => {
    renderModal({ defaultType: 'NGO' })
    fireEvent.click(screen.getByRole('radio', { name: '국제기구' }))
    expect(screen.getByRole('button', { name: /회원국·파트너국 검색·추가/ })).toBeInTheDocument()
    expect(screen.queryByText('현대 국가')).not.toBeInTheDocument()
  })

  it('못 쓰는 설립 연도는 조용히 버리지 않고 저장을 막는다', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('기관·조직명'), { target: { value: '공안위원회' } })
    fireEvent.change(screen.getByPlaceholderText('예: 1793'), { target: { value: '793' } })
    expect(screen.getByRole('button', { name: /1000~9999/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기구·조직 만들기' })).toBeDisabled()
  })

  it('이름을 적으면 저장되고 onCreated로 넘긴다', async () => {
    const { onCreated } = renderModal({ defaultType: 'NGO' })
    fireEvent.change(screen.getByLabelText('기관·조직명'), { target: { value: '자코뱅 클럽' } })
    fireEvent.change(screen.getByPlaceholderText('예: 1793'), { target: { value: '1789' } })
    const submit = screen.getByRole('button', { name: '기구·조직 만들기' })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(createMock.mock.calls[0][1]).toMatchObject({
      name: '자코뱅 클럽',
      type: 'NGO',
      foundedDate: '1789-01-01T00:00:00.000Z',
    })
  })
})
