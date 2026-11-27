import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PlaceFields, type PlaceFieldsProps } from './place-fields'

jest.mock('@/shared/api/place', () => ({ placeApi: { resolve: jest.fn() } }))
jest.mock('@/shared/ui/headquarters-location-field', () => ({
  HeadquartersMapPreview: ({ headquarters }: { headquarters: string }) => (
    <div data-testid="map-preview">{headquarters}</div>
  ),
  HeadquartersPinPickerModal: () => null,
}))
jest.mock('@/shared/ui/place-autocomplete/place-autocomplete', () => ({
  PlaceSelect: ({ placeholder }: { placeholder?: string }) => (
    <input aria-label={`검색 ${placeholder ?? ''}`} readOnly />
  ),
}))

const SEOUL = { displayName: '서울', shortName: '서울', placeId: 'pl-seoul', latitude: 37.56, longitude: 126.97 }

function renderFields(props: Partial<PlaceFieldsProps> = {}) {
  const handlers = {
    setBirthPlace: jest.fn(),
    setDeathPlace: jest.fn(),
    setBurialPlace: jest.fn(),
    setBirthHistoricalLabel: jest.fn(),
    setDeathHistoricalLabel: jest.fn(),
    setBurialHistoricalLabel: jest.fn(),
    setBurialNote: jest.fn(),
    setBirthCityId: jest.fn(),
    setDeathCityId: jest.fn(),
    onCopyBirthToDeathPlace: jest.fn(),
    markDirty: jest.fn(),
  }
  renderWithTheme(
    <PlaceFields countryId="" birthPlace={null} deathPlace={null} {...handlers} {...props} />,
  )
  return handlers
}

describe('PlaceFields — 장소 하나 = 한 줄', () => {
  it('세 장소 모두 당대 지명 칸을 같은 줄에 두고, 지도 요약은 장소를 고르기 전엔 없다', () => {
    const handlers = renderFields()
    expect(screen.getByLabelText('출생지 당대 지명 표기')).toBeInTheDocument()
    expect(screen.getByLabelText('사망지 당대 지명 표기')).toBeInTheDocument()
    expect(screen.getByLabelText('묘소·안장지 당대 지명 표기')).toBeInTheDocument()
    expect(screen.queryByTestId('map-preview')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('출생지 당대 지명 표기'), { target: { value: '한성부' } })
    expect(handlers.setBirthHistoricalLabel).toHaveBeenCalledWith('한성부')
    expect(handlers.markDirty).toHaveBeenCalled()
  })

  it('핀은 아이콘 칸 — 좌표가 있으면 "핀 수정"으로 말한다', () => {
    renderFields({ birthPlace: SEOUL })
    expect(screen.getByRole('button', { name: '출생지 지도 핀 수정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '사망지 지도에서 핀 찍기' })).toBeInTheDocument()
  })

  it('위치 지도 — 고른 장소만 칩으로, 누른 하나만 펼치고 다시 누르면 접는다', () => {
    renderFields({ birthPlace: SEOUL })
    const chips = within(screen.getByRole('group', { name: '지도에서 볼 장소' }))
    const chip = chips.getByRole('button', { name: /출생지\s*서울/ })
    expect(chips.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByTestId('map-preview')).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('map-preview')).toHaveTextContent('서울')
    fireEvent.click(chip)
    expect(screen.queryByTestId('map-preview')).not.toBeInTheDocument()
  })

  it('장소를 하나도 안 고르면 위치 지도 줄이 없다', () => {
    renderFields()
    expect(screen.queryByText('위치 지도')).not.toBeInTheDocument()
  })

  it('출생지와 같음 — 출생지가 있고 사망지가 다를 때만', () => {
    const { onCopyBirthToDeathPlace } = renderFields({ birthPlace: SEOUL })
    fireEvent.click(screen.getByRole('button', { name: /출생지와 같음/ }))
    expect(onCopyBirthToDeathPlace).toHaveBeenCalled()
  })

  it('출생지와 같음 — 이미 같은 장소면 숨긴다', () => {
    renderFields({ birthPlace: SEOUL, deathPlace: { ...SEOUL } })
    expect(screen.queryByRole('button', { name: /출생지와 같음/ })).not.toBeInTheDocument()
  })

  it('안장 비고는 접혀 있다가 누르면 펼치고, 값이 있으면 처음부터 펼친다', () => {
    renderFields()
    expect(screen.queryByLabelText('안장·이장 비고')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /이장·안장 비고/ }))
    expect(screen.getByLabelText('안장·이장 비고')).toBeInTheDocument()
  })

  it('안장 비고 값이 있으면 처음부터 보인다', () => {
    renderFields({ burialNote: '1840년 파리로 이장' })
    expect(screen.getByLabelText('안장·이장 비고')).toHaveValue('1840년 파리로 이장')
    expect(screen.queryByRole('button', { name: /이장·안장 비고/ })).not.toBeInTheDocument()
  })
})
