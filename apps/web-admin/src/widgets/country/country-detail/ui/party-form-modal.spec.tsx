import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

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
jest.mock('@/shared/api/political-party', () => ({
  politicalPartyApi: {
    getById: jest.fn(async () => ({
      id: 'spd',
      name: '독일 사회민주당',
      shortName: 'SPD',
      localName: null,
      ideology: '사회민주주의, 노동',
      position: 'CENTER_LEFT',
      foundedDate: '1875-05-27T12:00:00.000Z',
      dissolvedDate: null,
      logoUrl: null,
      brandColor: '#e3000f',
    })),
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
      <PartyFormModal
        countryId="de"
        mode="create"
        saving={false}
        onClose={jest.fn()}
        onSubmitCreate={onSubmitCreate}
        onSubmitEdit={jest.fn()}
      />,
    )

  it('세 묶음 머리 · 명칭이 비면 저장이 잠기고 하단이 명칭으로 안내한다', () => {
    renderCreate()
    for (const heading of ['기본 정보', '노선', '표지']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '정당 등록' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /필수 입력: 명칭/ })).toBeInTheDocument()
  })

  it('스펙트럼 칩을 고르고 키워드·약칭과 함께 등록한다', () => {
    const onSubmitCreate = jest.fn()
    renderCreate(onSubmitCreate)
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '독일 사회민주당' } })
    fireEvent.change(screen.getByLabelText('약칭'), { target: { value: 'SPD' } })
    const centerLeft = screen.getByRole('radio', { name: '중도좌파' })
    fireEvent.click(centerLeft)
    expect(centerLeft).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: '좌파' }))
    const keywordInput = screen.getByLabelText(/이념·노선 키워드/)
    fireEvent.change(keywordInput, { target: { value: '사회민주주의, 노동' } })
    fireEvent.keyDown(keywordInput, { key: 'Enter' })
    expect(screen.getByText('사회민주주의')).toBeInTheDocument()
    expect(screen.getByText('등록 준비 완료')).toBeInTheDocument()
    expect(screen.getByLabelText('정당 표지 미리보기')).toHaveTextContent('SPD · 좌파')

    fireEvent.click(screen.getByRole('button', { name: '정당 등록' }))
    expect(onSubmitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '독일 사회민주당',
        shortName: 'SPD',
        position: 'LEFT',
        ideology: '사회민주주의, 노동',
        countryId: 'de',
        historicalCountryId: null,
      }),
    )
  })

  it('설립·해산은 사건 날짜 칸 — 연·월·일을 직접 치고, 덜 친 날짜는 저장을 막는다', () => {
    const onSubmitCreate = jest.fn()
    renderCreate(onSubmitCreate)
    fireEvent.change(screen.getByLabelText(/^명칭/), { target: { value: '국민당' } })
    const foundedField = screen.getByLabelText('설립일')
    const yearInput = foundedField.querySelector('input[aria-label="연도"]') as HTMLInputElement
    fireEvent.change(yearInput, { target: { value: '1919' } })
    expect(screen.getByRole('button', { name: '정당 등록' })).toBeDisabled()
    expect(screen.getAllByText('연·월·일을 모두 입력하세요.').length).toBeGreaterThan(0)

    fireEvent.change(foundedField.querySelector('input[aria-label="월"]') as HTMLInputElement, { target: { value: '01' } })
    fireEvent.change(foundedField.querySelector('input[aria-label="일"]') as HTMLInputElement, { target: { value: '05' } })
    fireEvent.click(screen.getByRole('button', { name: '정당 등록' }))
    expect(onSubmitCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '국민당', foundedDate: '1919-01-05T12:00:00.000Z' }),
    )
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
      <PartyFormModal
        countryId="de"
        mode="edit"
        partyId="spd"
        saving={false}
        onClose={onClose}
        onSubmitCreate={jest.fn()}
        onSubmitEdit={jest.fn()}
      />,
    )
    expect(await screen.findByDisplayValue('독일 사회민주당')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '중도좌파' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: '수정 완료' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    await Promise.resolve()
    await Promise.resolve()
    expect(onClose).toHaveBeenCalled()
  })
})
