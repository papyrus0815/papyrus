import { type ReactNode } from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import { cityApi } from '@/shared/api/city'
import { getTheme } from '@/shared/styles/theme'

import {
  LocationPickerModal,
  formatCoordinate,
  parseCoordinateInput,
} from './location-picker-modal'

jest.mock('@/shared/api/city', () => ({
  cityApi: {
    searchPlaces: jest.fn(),
  },
}))

jest.mock('@/shared/hooks/use-debounced-value', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}))

jest.mock('./location-picker-map', () => ({
  __esModule: true,
  default: ({
    point,
    onPick,
  }: {
    point: { lat: number; lng: number } | null
    onPick: (next: { lat: number; lng: number }) => void
  }) => (
    <div data-testid="mock-map">
      <output data-testid="map-point">
        {point ? `${point.lat},${point.lng}` : 'none'}
      </output>
      <button
        type="button"
        onClick={() => onPick({ lat: 37.95, lng: 126.67 })}
      >
        _pickOnMap
      </button>
    </div>
  ),
}))

const mockedSearchPlaces = cityApi.searchPlaces as jest.Mock

function renderModal(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('parseCoordinateInput', () => {
  it('일반 숫자 위·경도와 한글·영문 반구 표기 좌표를 파싱한다', () => {
    expect(parseCoordinateInput('48.8049, 2.1204')).toEqual({
      lat: 48.8049,
      lng: 2.1204,
    })
    expect(parseCoordinateInput('북위 37.9560°, 동경 126.6770°')).toEqual({
      lat: 37.956,
      lng: 126.677,
    })
    expect(parseCoordinateInput('남위 33.8688, 서경 151.2093')).toEqual({
      lat: -33.8688,
      lng: -151.2093,
    })
    expect(parseCoordinateInput('48.8049° N, 2.1204° E')).toEqual({
      lat: 48.8049,
      lng: 2.1204,
    })
  })

  it('범위를 벗어난 위·경도나 일반 장소명은 null을 반환한다', () => {
    expect(parseCoordinateInput('95.0, 2.1204')).toBeNull()
    expect(parseCoordinateInput('48.8, 195.0')).toBeNull()
    expect(parseCoordinateInput('베르사유 궁전')).toBeNull()
    expect(parseCoordinateInput('')).toBeNull()
  })
})

describe('LocationPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('장소 검색 결과를 연달아 고르면 자동 채워진 위치 이름도 새 장소로 갱신되고, 직접 적은 설명이 있으면 이름 교체 버튼을 제안한다', async () => {
    mockedSearchPlaces.mockImplementation(async (query: string) => {
      if (query.includes('베르사유')) {
        return [
          {
            placeId: 'p1',
            shortName: '베르사유 궁전',
            displayName: '프랑스 일드프랑스 베르사유 궁전',
            lat: 48.8049,
            lng: 2.1204,
          },
        ]
      }
      if (query.includes('워털루')) {
        return [
          {
            placeId: 'p2',
            shortName: '워털루',
            displayName: '벨기에 브라방왈롱 워털루',
            lat: 50.7147,
            lng: 4.3991,
          },
        ]
      }
      return []
    })

    const onSave = jest.fn()
    renderModal(
      <LocationPickerModal
        isOpen
        onClose={jest.fn()}
        initial={{}}
        onSave={onSave}
      />,
    )

    const searchInput = screen.getByRole('searchbox', { name: '장소 검색' })
    fireEvent.change(searchInput, { target: { value: '베르사유' } })

    const firstOption = await screen.findByText('베르사유 궁전')
    fireEvent.click(firstOption)

    const labelInput = screen.getByLabelText(
      '장소 이름',
    ) as HTMLTextAreaElement
    expect(labelInput.value).toBe('베르사유 궁전')

    // 이어서 다른 장소를 검색해 Enter로 고르면 자동 채워졌던 이름도 새 장소명으로 바뀐다
    fireEvent.change(searchInput, { target: { value: '워털루' } })
    await screen.findByText('워털루')
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(labelInput.value).toBe('워털루')

    // 사용자가 직접 설명을 고친 뒤 다른 장소를 고르면 기존 설명을 보존하고 이름 바꾸기 보조 버튼을 노출한다
    fireEvent.change(labelInput, {
      target: { value: '벨기에 워털루 인근 전장' },
    })
    fireEvent.change(searchInput, { target: { value: '베르사유' } })
    fireEvent.click(await screen.findByText('베르사유 궁전'))

    expect(labelInput.value).toBe('벨기에 워털루 인근 전장')
    const replaceBtn = screen.getByRole('button', {
      name: /베르사유 궁전.*이름 바꾸기/,
    })
    fireEvent.click(replaceBtn)
    expect(labelInput.value).toBe('베르사유 궁전')
  })

  it('검색창에 위·경도 좌표를 입력하면 API 호출 없이 즉시 해당 좌표로 핀을 이동할 수 있고, 위치 모두 지우기로 한 번에 비울 수 있다', async () => {
    const onSave = jest.fn()
    renderModal(
      <LocationPickerModal
        isOpen
        onClose={jest.fn()}
        initial={{ location: '판문점' }}
        onSave={onSave}
      />,
    )

    const searchInput = screen.getByRole('searchbox', { name: '장소 검색' })
    fireEvent.change(searchInput, { target: { value: '37.956, 126.677' } })

    expect(screen.getByText('좌표로 바로 핀 이동')).toBeInTheDocument()
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(
        screen.getByText(formatCoordinate({ lat: 37.956, lng: 126.677 })),
      ).toBeInTheDocument()
    })

    // 위치 모두 지우기 클릭 시 이름·좌표가 모두 초기화된 상태로 저장된다
    fireEvent.click(screen.getByRole('button', { name: '위치 모두 지우기' }))
    expect(onSave).toHaveBeenCalledWith({
      location: '',
      locationLatitude: null,
      locationLongitude: null,
      locationNote: null,
    })
  })
})
