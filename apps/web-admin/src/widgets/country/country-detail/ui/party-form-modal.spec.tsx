import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import {
  RegisterFooterStatus,
  RegisterSectionJumpNav,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'

import { PartyFormModal } from './country-political-parties-block.widget'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/entities/political-system/api', () => ({ usePoliticalSystems: () => ({ data: [] }) }))
jest.mock('@/shared/api/political-party', () => ({
  /* 상수·라벨(종류·이름 유형·법적 지위)은 실제 모듈 그대로 — 네트워크만 막는다 */
  ...jest.requireActual('@/shared/api/political-party'),
  politicalPartyApi: {
    getById: jest.fn(async () => ({
      id: 'spd',
      name: '독일 사회민주당',
      shortName: 'SPD',
      localName: null,
      ideology: '사회민주주의, 노동',
      position: 'CENTER_LEFT',
      kind: 'PARTY',
      foundedEra: 'AD',
      foundedYear: 1875,
      foundedMonth: 5,
      foundedDay: 27,
      foundedPrecision: 'day',
      foundedDate: '1875-05-27T12:00:00.000Z',
      dissolvedDate: null,
      logoUrl: null,
      brandColor: '#e3000f',
    })),
    getIdeologies: jest.fn(async () => [
      {
        id: 'link-1',
        partyId: 'spd',
        ideologyId: 'socdem',
        isPrimary: true,
        sortOrder: 0,
        ideology: { id: 'socdem', name: '사회민주주의', category: 'IDEOLOGY' },
      },
    ]),
  },
}))

/** 이념 고르기(카탈로그 조회)가 react-query를 쓴다 */
const withQuery = (node: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>
)
jest.mock('@/shared/api/ideology', () => ({
  ...jest.requireActual('@/shared/api/ideology'),
  ideologyApi: {
    list: jest.fn(async () => [
      { id: 'socdem', name: '사회민주주의', englishName: 'Social democracy', category: 'IDEOLOGY', aliases: [] },
      { id: 'marxism', name: '마르크스주의', englishName: 'Marxism', category: 'IDEOLOGY', aliases: [] },
    ]),
    create: jest.fn(async (body: { name: string }) => ({ id: 'new-ideology', name: body.name, category: 'IDEOLOGY' })),
  },
}))
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
  uploadImage: jest.fn(),
  validateImageFile: jest.fn(),
}))

describe('등록 모달 크롬 조립품', () => {
  it('섹션 이동 — 배지(✓·숫자)와 현재 위치', () => {
    const onJump = jest.fn()
    renderWithTheme(
      <RegisterSectionJumpNav
        sections={[
          { id: 'basic', label: '기본 정보', badge: '✓' },
          { id: 'leg', label: '의회·임기', badge: '2' },
          { id: 'stats', label: '집계·설명', badge: null },
        ]}
        activeId="leg"
        onJump={onJump}
      />,
    )
    expect(screen.getByRole('button', { name: /의회·임기/ })).toHaveAttribute('aria-current', 'location')
    expect(screen.getByText('✓')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /집계·설명/ }))
    expect(onJump).toHaveBeenCalledWith('stats')
  })

  it('상태줄 — 빠진 필수 → 이동 알약, 문제 → 경고, 다 차면 준비 완료 + 단축키', () => {
    const onJump = jest.fn()
    const { rerender } = renderWithTheme(
      <RegisterFooterStatus missing={['명칭', '투표일']} onJumpToMissing={onJump} readyLabel="등록 준비 완료" shortcuts={[]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /필수 입력: 명칭/ }))
    expect(onJump).toHaveBeenCalled()
    expect(screen.getByText('외 1건')).toBeInTheDocument()

    rerender(
      <RegisterFooterStatus missing={[]} problem="해산일이 설립일보다 앞설 수 없습니다." readyLabel="등록 준비 완료" shortcuts={[]} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('해산일이 설립일보다')

    rerender(
      <RegisterFooterStatus missing={[]} readyLabel="등록 준비 완료" shortcuts={[{ keys: '⌘↵', label: '저장' }]} />,
    )
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()
    expect(screen.getByText('⌘↵')).toBeInTheDocument()
  })
})

describe('PartyFormModal — 사건 등록 모달 문법', () => {
  const renderCreate = (onSubmitCreate = jest.fn()) =>
    renderWithTheme(
      withQuery(
        <PartyFormModal
          countryId="de"
          mode="create"
          saving={false}
          onClose={jest.fn()}
          onSubmitCreate={onSubmitCreate}
          onSubmitEdit={jest.fn()}
        />,
      ),
    )

  it('세 묶음 머리 · 명칭이 비면 저장이 잠기고 하단이 명칭으로 안내한다', () => {
    renderCreate()
    for (const heading of ['기본 정보', '노선', '표지']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '정당 등록' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /필수 입력: 명칭/ })).toBeInTheDocument()
  })

  it('스펙트럼 칩·약칭, 이념은 목록에서 고르고 없으면 새로 만들어 등록한다', async () => {
    const onSubmitCreate = jest.fn()
    renderCreate(onSubmitCreate)
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '독일 사회민주당' } })
    fireEvent.change(screen.getByLabelText('약칭'), { target: { value: 'SPD' } })
    const centerLeft = screen.getByRole('radio', { name: '중도좌파' })
    fireEvent.click(centerLeft)
    expect(centerLeft).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: '좌파' }))

    const ideologyInput = screen.getByRole('combobox')
    fireEvent.focus(ideologyInput)
    fireEvent.click(await screen.findByRole('option', { name: /사회민주주의/ }))
    fireEvent.change(ideologyInput, { target: { value: '노동조합주의' } })
    fireEvent.click(await screen.findByRole('option', { name: /「노동조합주의」을 이념 목록에 새로 만들기/ }))
    await screen.findByRole('button', { name: '노동조합주의 빼기' })
    expect(screen.getByLabelText('대표')).toBeInTheDocument()
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()
    expect(screen.getByLabelText('정당 표지 미리보기')).toHaveTextContent('SPD · 좌파')

    fireEvent.click(screen.getByRole('button', { name: '정당 등록' }))
    expect(onSubmitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '독일 사회민주당',
        shortName: 'SPD',
        position: 'LEFT',
        ideologyIds: ['socdem', 'new-ideology'],
        countryId: 'de',
        historicalCountryId: null,
      }),
    )
  })

  it('창당·해산은 구조화 날짜 — 연도만·기원전도 저장하고, 해산이 앞서면 막는다', () => {
    const onSubmitCreate = jest.fn()
    renderCreate(onSubmitCreate)
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '옵티마테스' } })
    fireEvent.click(screen.getByRole('radio', { name: '붕당·파벌' }))

    const foundedField = screen.getByLabelText('창당일')
    fireEvent.change(foundedField.querySelector('input[aria-label="연도"]') as HTMLInputElement, {
      target: { value: '133' },
    })
    fireEvent.click(foundedField.querySelector('button[title="서기 ↔ 기원전"]') as HTMLButtonElement)

    /* 해산 BC 200 — 창당(BC 133)보다 앞이라 역전 */
    const dissolvedField = screen.getByLabelText('해산일')
    fireEvent.change(dissolvedField.querySelector('input[aria-label="연도"]') as HTMLInputElement, {
      target: { value: '200' },
    })
    fireEvent.click(dissolvedField.querySelector('button[title="서기 ↔ 기원전"]') as HTMLButtonElement)
    expect(screen.getByRole('button', { name: '정당 등록' })).toBeDisabled()
    expect(screen.getAllByText(/보다 앞설 수 없습니다/).length).toBeGreaterThan(0)

    /* 해산 BC 27로 고치면 저장 — 연 정밀, 월·일 없이 */
    fireEvent.change(dissolvedField.querySelector('input[aria-label="연도"]') as HTMLInputElement, {
      target: { value: '27' },
    })
    fireEvent.click(screen.getByRole('button', { name: '정당 등록' }))
    expect(onSubmitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '옵티마테스',
        kind: 'FACTION',
        founded: { era: 'BC', year: 133 },
        dissolved: { era: 'BC', year: 27 },
      }),
    )
  })

  it('없는 날짜(2월 30일)는 칸 옆에서 막는다', () => {
    renderCreate()
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '국민당' } })
    const foundedField = screen.getByLabelText('창당일')
    fireEvent.change(foundedField.querySelector('input[aria-label="연도"]') as HTMLInputElement, { target: { value: '1919' } })
    fireEvent.change(foundedField.querySelector('input[aria-label="월"]') as HTMLInputElement, { target: { value: '02' } })
    fireEvent.change(foundedField.querySelector('input[aria-label="일"]') as HTMLInputElement, { target: { value: '30' } })
    expect(screen.getAllByText('없는 날짜입니다.').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '정당 등록' })).toBeDisabled()
  })

  it('브랜드 컬러 형식이 틀리면 저장이 잠기고 이유를 하단에 적는다', () => {
    renderCreate()
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '국민당' } })
    fireEvent.change(screen.getByLabelText(/^브랜드 컬러/), { target: { value: '#12' } })
    expect(screen.getByRole('button', { name: '정당 등록' })).toBeDisabled()
    expect(screen.getAllByRole('alert').some((element) => /#RRGGBB/.test(element.textContent ?? ''))).toBe(true)
  })

  it('수정 — 불러온 값으로 채우고, 바꾼 게 없으면 닫을 때 묻지 않는다', async () => {
    const onClose = jest.fn()
    renderWithTheme(
      withQuery(
        <PartyFormModal
          countryId="de"
          mode="edit"
          partyId="spd"
          saving={false}
          onClose={onClose}
          onSubmitCreate={jest.fn()}
          onSubmitEdit={jest.fn()}
        />,
      ),
    )
    expect(await screen.findByDisplayValue('독일 사회민주당')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '중도좌파' })).toHaveAttribute('aria-checked', 'true')
    /* 이념은 카탈로그 연결에서 불러온다 */
    expect(screen.getByRole('button', { name: '사회민주주의 빼기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '수정 완료' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    await Promise.resolve()
    await Promise.resolve()
    expect(onClose).toHaveBeenCalled()
  })

  it('등록 후 계속 — 성공하면 창을 비우고 명칭 칸으로, 등록한 정당을 위 띠에 쌓는다', async () => {
    const onSubmitCreate = jest.fn(async () => undefined)
    renderCreate(onSubmitCreate)
    const nameInput = screen.getByLabelText(/^명칭/) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '독일 사회민주당' } })
    fireEvent.change(screen.getByLabelText('약칭'), { target: { value: 'SPD' } })
    fireEvent.click(screen.getByRole('button', { name: '등록 후 계속' }))
    expect(onSubmitCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '독일 사회민주당', shortName: 'SPD' }),
      { keepOpen: true },
    )
    await waitFor(() => expect(screen.getByText('이 창에서 1개 등록')).toBeInTheDocument())
    expect(screen.getByText('SPD')).toBeInTheDocument()
    expect((screen.getByLabelText(/^명칭/) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('약칭') as HTMLInputElement).value).toBe('')
    /* 하단 취소가 '닫기'로 — 헤더 X도 aria-label이 닫기라 글자로 찾는다 */
    expect(screen.getByText('닫기', { selector: 'button' })).toBeInTheDocument()
  })

  it('등록 후 계속 — 실패하면 입력을 그대로 둔다', async () => {
    const onSubmitCreate = jest.fn(async () => {
      throw new Error('중복')
    })
    renderCreate(onSubmitCreate)
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '중앙당' } })
    fireEvent.click(screen.getByRole('button', { name: '등록 후 계속' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '등록 후 계속' })).not.toBeDisabled())
    expect((screen.getByLabelText(/^명칭/) as HTMLInputElement).value).toBe('중앙당')
    expect(screen.queryByText(/이 창에서/)).not.toBeInTheDocument()
  })
})
