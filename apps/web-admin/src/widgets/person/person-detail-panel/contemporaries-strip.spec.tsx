/**
 * ContemporariesStrip 렌더 테스트 — 어댑터 로직(contemporaries-strip.lib.spec)이 아닌
 * 컴포넌트 상호작용을 회귀 방지: scope 토글이 쿼리 파라미터를 바꾸는지, 비소유 칩이
 * 비클릭(role=img)으로 렌더되는지, 절단 안내가 모달/비모달로 분기하는지.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import type {
  ContemporaryRuler,
  PersonContemporariesResponse,
} from '@/shared/api/person-contemporaries'

// upload → client.ts(import.meta)를 끊는다 (아바타는 profileImageUrl=null이라 미사용)
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))

// 모듈 전체를 목킹한다 — 실제 모듈은 import.meta.env(axios baseURL)를 써서 ts-jest가 못 읽는다.
// 쿼리키는 scope에 따라 달라지기만 하면 되므로 실제와 동형으로 재현한다.
jest.mock('@/shared/api/person-contemporaries', () => ({
  getPersonContemporaries: jest.fn(),
  personContemporariesKeys: {
    all: ['person-contemporaries'],
    byPerson: (personId: string, params: { scope?: string } = {}) => [
      'person-contemporaries',
      personId,
      null,
      null,
      params.scope ?? 'all',
      null,
    ],
  },
}))

import {
  ContemporariesStrip,
} from './contemporaries-strip'
import { getPersonContemporaries } from '@/shared/api/person-contemporaries'

const mockGet = getPersonContemporaries as jest.MockedFunction<
  typeof getPersonContemporaries
>

function ruler(overrides: {
  id: string
  label: string
  isOwned?: boolean
}): ContemporaryRuler {
  return {
    person: {
      id: overrides.id,
      name: overrides.label,
      surname: null,
      middleName: null,
      nameDisplayOrder: null,
      country: null,
      profileImageUrl: null,
      templeName: overrides.label,
      regnalName: null,
      isAlive: false,
      deathYear: 1450,
      isOwned: overrides.isOwned ?? true,
    },
    records: [
      {
        recordId: `rec-${overrides.id}`,
        recordKind: 'SOVEREIGN_REIGN',
        positionType: 'HEAD_OF_STATE',
        title: '국왕',
        appointmentMethod: null,
        regnalName: null,
        regnalNumber: null,
        termNumber: null,
        startYear: 1418,
        endYear: 1450,
        startDate: '1418-01-01T00:00:00.000Z',
        endDate: '1450-01-01T00:00:00.000Z',
        country: null,
        historicalCountry: { id: 'joseon', name: '조선' },
      },
    ],
    overlapYears: 32,
  }
}

function response(
  rulers: ContemporaryRuler[],
  metaOverrides: Partial<PersonContemporariesResponse['meta']> = {},
): PersonContemporariesResponse {
  return {
    meta: {
      window: { fromYear: 1418, toYear: 1451 },
      derivedFromSubject: true,
      scope: 'all',
      totalPersons: rulers.length,
      omittedCount: 0,
      candidatesTruncated: false,
      ...metaOverrides,
    },
    rulers,
  }
}

function renderStrip(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

beforeEach(() => {
  mockGet.mockReset()
})

it('enabled=false면 아무것도 렌더하지 않고 요청도 안 한다', () => {
  const { container } = renderStrip(
    <ContemporariesStrip personId="p1" enabled={false} onPersonClick={jest.fn()} />,
  )
  expect(container).toBeEmptyDOMElement()
  expect(mockGet).not.toHaveBeenCalled()
})

it('scope 토글을 "같은 나라"로 바꾸면 sameCountry로 재요청한다', async () => {
  mockGet.mockResolvedValue(response([ruler({ id: 'sejong', label: '세종' })]))
  renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={jest.fn()} />,
  )
  await screen.findByText('세종')
  expect(mockGet).toHaveBeenLastCalledWith('p1', { scope: 'all' })

  fireEvent.click(screen.getByRole('radio', { name: '같은 나라' }))
  await waitFor(() =>
    expect(mockGet).toHaveBeenLastCalledWith('p1', { scope: 'sameCountry' }),
  )
})

it('비소유 칩은 비클릭(role=img)으로 렌더돼 상세 진입 데드엔드를 만들지 않는다', async () => {
  const onPersonClick = jest.fn()
  mockGet.mockResolvedValue(
    response([ruler({ id: 'foreign', label: '남의세종', isOwned: false })]),
  )
  renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={onPersonClick} />,
  )
  const chip = await screen.findByRole('img', { name: /남의세종/ })
  expect(chip.tagName).not.toBe('BUTTON')
  // 비소유 칩엔 클릭 핸들러가 없다
  fireEvent.click(chip)
  expect(onPersonClick).not.toHaveBeenCalled()
})

it('소유 칩 클릭은 onPersonClick(personId)을 호출한다', async () => {
  const onPersonClick = jest.fn()
  mockGet.mockResolvedValue(response([ruler({ id: 'sejong', label: '세종' })]))
  renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={onPersonClick} />,
  )
  fireEvent.click(await screen.findByRole('button', { name: /세종/ }))
  expect(onPersonClick).toHaveBeenCalledWith('sejong')
})

it('수장이 2명 이상이면 헤더에 정렬 근거(겹친 기간 긴 순) 캡션을 노출한다', async () => {
  mockGet.mockResolvedValue(
    response([
      ruler({ id: 'sejong', label: '세종' }),
      ruler({ id: 'munjong', label: '문종' }),
    ]),
  )
  renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={jest.fn()} />,
  )
  await screen.findByRole('button', { name: /세종/ })
  expect(screen.getByText(/겹친 기간 긴 순/)).toBeInTheDocument()
})

it('칩에 어떤 재임인지(직위)가 상시 노출된다', async () => {
  mockGet.mockResolvedValue(response([ruler({ id: 'sejong', label: '세종' })]))
  renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={jest.fn()} />,
  )
  await screen.findByRole('button', { name: /세종/ })
  // 픽스처 record.title='국왕' — hover가 아니라 칩 본문 텍스트로 보인다
  expect(screen.getByText('국왕')).toBeInTheDocument()
})

it('칩 aria-label·title에 겹침 기간 상세를 실어 정보밀도를 보강한다', async () => {
  mockGet.mockResolvedValue(response([ruler({ id: 'sejong', label: '세종' })]))
  renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={jest.fn()} />,
  )
  const chip = await screen.findByRole('button', { name: /세종/ })
  // ruler() 기본 overlapYears=32
  expect(chip.getAttribute('aria-label')).toContain('겹침 32년')
  expect(chip.getAttribute('title')).toContain('겹침 32년')
})

it('절단 안내: onOpenCompare 있으면 딥링크 버튼, 없으면(모달) 죽은 포인터 없는 중립 문구', async () => {
  mockGet.mockResolvedValue(
    response([ruler({ id: 'sejong', label: '세종' })], { omittedCount: 5 }),
  )
  // 모달 임베드(onOpenCompare 미전달) — 중립 문구, '수장 비교' 포인터 없음
  const { unmount } = renderStrip(
    <ContemporariesStrip personId="p1" enabled onPersonClick={jest.fn()} />,
  )
  expect(await screen.findByText(/외 5명 더 있음/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /수장 비교에서 보기/ })).toBeNull()
  unmount()

  // 비모달(onOpenCompare 전달) — 절단 안내가 딥링크 버튼
  const onOpenCompare = jest.fn()
  renderStrip(
    <ContemporariesStrip
      personId="p2"
      enabled
      onPersonClick={jest.fn()}
      onOpenCompare={onOpenCompare}
    />,
  )
  const linkBtn = await screen.findByRole('button', {
    name: /외 5명 더 — 수장 비교에서 보기/,
  })
  fireEvent.click(linkBtn)
  expect(onOpenCompare).toHaveBeenCalled()
})
